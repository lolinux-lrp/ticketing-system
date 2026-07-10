import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMeetingSchema } from "@/lib/validations/meetings";
import { 
  sendMeetingInvitationEmail,
  sendMeetingCancelledEmail,
  sendAttendeeDeclinedEmail
} from "@/lib/email";
import { deleteGoogleMeetRoom } from "@/lib/calendar/googleMeet";
import { RouteParams } from "@/types/api";
import type {
  MeetingEmailPayload,
  MeetingWithAttendees,
} from "@/types/meeting";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Shared Prisma include — produces the MeetingWithAttendees shape
// ---------------------------------------------------------------------------

const MEETING_INCLUDE = {
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
  attendees: {
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
  ticket: {
    select: { id: true, title: true, createdById: true },
  },
} as const;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Loads a meeting by ID with full attendee details, or returns null.
 * Used by all three handlers to avoid duplicated Prisma queries.
 */
async function fetchMeeting(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: MEETING_INCLUDE,
  });
}

/**
 * Builds a `MeetingEmailPayload` from a fully-included meeting record.
 * Used by POST (create) and PATCH (reschedule) to drive email dispatch.
 */
async function buildEmailPayload(
  meeting: Awaited<ReturnType<typeof fetchMeeting>> & object,
  ticketContext: MeetingEmailPayload["ticketContext"]
): Promise<MeetingEmailPayload> {
  return {
    title:        meeting.title,
    description:  meeting.description ?? undefined,
    startTimeUtc: meeting.startTime.toISOString(),
    endTimeUtc:   meeting.endTime.toISOString(),
    meetingUrl:   meeting.meetingUrl,
    host: {
      id:    meeting.createdBy.id,
      name:  meeting.createdBy.name,
      email: meeting.createdBy.email,
    },
    attendees: meeting.attendees
      .filter((a) => a.userId !== meeting.createdById)
      .map((a) => ({
        id:    a.user.id,
        name:  a.user.name,
        email: a.user.email,
      })),
    ticketContext,
  };
}

// ---------------------------------------------------------------------------
// GET /api/meetings/[id] — retrieve a single meeting
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await fetchMeeting(id);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // STRICT 403 GUARD: caller must be a participant of this meeting
    const isParticipant = meeting.attendees.some(
      (a) => a.userId === session.user.id
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { data: meeting as MeetingWithAttendees },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/meetings/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/meetings/[id] — update RSVP status or reschedule
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await fetchMeeting(id);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // STRICT 403 GUARD: caller must be a participant
    const callerAttendeeRow = meeting.attendees.find(
      (a) => a.userId === session.user.id
    );
    if (!callerAttendeeRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json();
    const validation = updateMeetingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      startTime,
      endTime,
      ticketId,
      attendeeIds,
      attendeeStatus,
    } = validation.data;

    const isRescheduling = startTime !== undefined || endTime !== undefined;

    // --- Resolve final start/end dates for overlap check and update ---
    const newStartDate = startTime
      ? new Date(startTime)
      : meeting.startTime;
    const newEndDate = endTime ? new Date(endTime) : meeting.endTime;

    if (newEndDate <= newStartDate) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // CONFLICT ENGINE — only runs when rescheduling
    // Overlap: ExistingStart < NewEnd AND ExistingEnd > NewStart
    // Excludes the current meeting itself from the conflict scan.
    // -----------------------------------------------------------------------
    if (isRescheduling) {
      const participantIds = meeting.attendees.map((a) => a.userId);

      const conflictingMeeting = await prisma.meeting.findFirst({
        where: {
          id:   { not: id }, // Exclude this meeting from self-conflict
          attendees: {
            some: {
              userId: { in: participantIds },
              status: { in: ["ACCEPTED", "PENDING"] },
            },
          },
          startTime: { lt: newEndDate },   // ExistingStart < NewEnd
          endTime:   { gt: newStartDate }, // ExistingEnd   > NewStart
        },
        select: { id: true, title: true, startTime: true, endTime: true },
      });

      if (conflictingMeeting) {
        return NextResponse.json(
          {
            error: `Scheduling conflict: a participant already has an accepted or pending meeting "${conflictingMeeting.title}" that overlaps with the requested time slot.`,
            conflict: {
              meetingId: conflictingMeeting.id,
              startTime: conflictingMeeting.startTime.toISOString(),
              endTime:   conflictingMeeting.endTime.toISOString(),
            },
          },
          { status: 409 }
        );
      }
    }

    // -----------------------------------------------------------------------
    // RSVP & Cancellation Logic
    // -----------------------------------------------------------------------

    const meetingWithTicket = meeting as typeof meeting & { ticket?: { createdById: string; title: string; id: string } | null };
    const isHostOrCreator =
      session.user.id === meeting.createdById ||
      (meetingWithTicket.ticket !== null && meetingWithTicket.ticket !== undefined && session.user.id === meetingWithTicket.ticket.createdById);

    // 1. IF HOST/CREATOR CANCELS
    if (isHostOrCreator && (attendeeStatus === "CANCELLED" || attendeeStatus === "DECLINED")) {
      await prisma.meetingAttendee.updateMany({
        where: { meetingId: id },
        data: { status: "CANCELLED" },
      });

      if (meeting.externalGoogleEventId) {
        await deleteGoogleMeetRoom(meeting.externalGoogleEventId).catch((err) => console.error("[PATCH /api/meetings/[id]] Failed to delete Google Meet room:", err));
      }

      let ticketContext: MeetingEmailPayload["ticketContext"] = undefined;
      if (meetingWithTicket.ticket) {
        ticketContext = { ticketId: meetingWithTicket.ticket.id, ticketTitle: meetingWithTicket.ticket.title };
      }

      const updatedMeetingRecord = await fetchMeeting(id);
      if (updatedMeetingRecord) {
        const emailPayload = await buildEmailPayload(updatedMeetingRecord, ticketContext);
        sendMeetingCancelledEmail(emailPayload).catch((err) => console.error("[PATCH /api/meetings/[id]] Email dispatch failed:", err));
        return NextResponse.json({ data: updatedMeetingRecord as MeetingWithAttendees }, { status: 200 });
      }
    }

    // 2. IF STANDARD ATTENDEE DECLINES
    if (!isHostOrCreator && attendeeStatus === "DECLINED") {
      await prisma.meetingAttendee.update({
        where: { meetingId_userId: { meetingId: id, userId: session.user.id } },
        data: { status: "DECLINED" },
      });

      let ticketContext: MeetingEmailPayload["ticketContext"] = undefined;
      if (meetingWithTicket.ticket) {
        ticketContext = { ticketId: meetingWithTicket.ticket.id, ticketTitle: meetingWithTicket.ticket.title };
      }

      const updatedMeetingRecord = await fetchMeeting(id);
      if (updatedMeetingRecord) {
        const emailPayload = await buildEmailPayload(updatedMeetingRecord, ticketContext);
        sendAttendeeDeclinedEmail(emailPayload, { name: session.user.name, email: session.user.email }).catch((err) => console.error("[PATCH /api/meetings/[id]] Email dispatch failed:", err));
        return NextResponse.json({ data: updatedMeetingRecord as MeetingWithAttendees }, { status: 200 });
      }
    }

    // -----------------------------------------------------------------------
    // Apply updates inside a transaction (Rescheduling & Other RSVPs)
    // -----------------------------------------------------------------------

    const updatedMeeting = await prisma.$transaction(async (tx) => {
      // 1. Update RSVP status for the caller if requested (e.g. ACCEPTED)
      if (attendeeStatus !== undefined) {
        await tx.meetingAttendee.update({
          where: {
            meetingId_userId: {
              meetingId: id,
              userId:    session.user.id,
            },
          },
          data: { status: attendeeStatus },
        });
      }

      // 2. Replace attendee list if provided (host row is preserved)
      if (attendeeIds !== undefined) {
        // Remove all non-host attendees, then re-create the new list
        await tx.meetingAttendee.deleteMany({
          where: {
            meetingId: id,
            userId:    { not: meeting.createdById },
          },
        });
        if (attendeeIds.length > 0) {
          await tx.meetingAttendee.createMany({
            data: attendeeIds.map((uid) => ({
              meetingId: id,
              userId:    uid,
              status:    "PENDING" as const,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3. Update the Meeting record itself
      return tx.meeting.update({
        where: { id },
        data: {
          ...(title       !== undefined ? { title }       : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isRescheduling            ? { startTime: newStartDate, endTime: newEndDate } : {}),
          ...(ticketId    !== undefined ? { ticketId }    : {}),
        },
        include: MEETING_INCLUDE,
      });
    });

    // -----------------------------------------------------------------------
    // Re-dispatch invitation email if the meeting was rescheduled
    // -----------------------------------------------------------------------
    if (isRescheduling) {
      let ticketContext: MeetingEmailPayload["ticketContext"] = undefined;
      if (updatedMeeting.ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: updatedMeeting.ticketId },
          select: { id: true, title: true },
        });
        if (ticket) {
          ticketContext = { ticketId: ticket.id, ticketTitle: ticket.title };
        }
      }

      const emailPayload = await buildEmailPayload(updatedMeeting, ticketContext);

      sendMeetingInvitationEmail(emailPayload).catch((err) =>
        console.error("[PATCH /api/meetings/[id]] Email dispatch failed:", err)
      );
    }

    return NextResponse.json(
      { data: updatedMeeting as MeetingWithAttendees },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/meetings/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/meetings/[id] — cancel a meeting (host only)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await fetchMeeting(id);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // STRICT 403 GUARD: caller must be a participant
    const isParticipant = meeting.attendees.some(
      (a) => a.userId === session.user.id
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the meeting host may delete / cancel the meeting
    if (meeting.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: only the meeting host can cancel this meeting" },
        { status: 403 }
      );
    }

    if (meeting.externalGoogleEventId) {
      await deleteGoogleMeetRoom(meeting.externalGoogleEventId).catch((err) => 
        console.error("[DELETE /api/meetings/[id]] Failed to delete Google Meet room:", err)
      );
    }

    let ticketContext: MeetingEmailPayload["ticketContext"] = undefined;
    if (meeting.ticket) {
      ticketContext = { ticketId: meeting.ticket.id, ticketTitle: meeting.ticket.title };
    }
    const emailPayload = await buildEmailPayload(meeting, ticketContext);
    sendMeetingCancelledEmail(emailPayload).catch((err) => 
      console.error("[DELETE /api/meetings/[id]] Email dispatch failed:", err)
    );

    // Cascading delete on MeetingAttendee is configured in the Prisma schema
    await prisma.meeting.delete({ where: { id } });

    return NextResponse.json(
      { message: "Meeting cancelled successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/meetings/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel meeting" },
      { status: 500 }
    );
  }
}
