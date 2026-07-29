import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { broadcastTicketMutation } from "@/lib/realtime/emitter";
import { prisma } from "@/lib/prisma";
import { updateMeetingSchema } from "@/lib/validations/meetings";
import { sendTicketReplyEmail } from "@/lib/email";
import { EmailTemplates } from "@/lib/email-templates";
import { deleteGoogleMeetRoom } from "@/lib/calendar/googleMeet";
import { RouteParams } from "@/types/api";
import type { MeetingWithAttendees } from "@/types/meeting";

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
    select: { 
      id: true, 
      title: true, 
      createdById: true,
      createdBy: { select: { email: true } },
      contactEmail: true,
      ccEmails: true,
      assignedTo: { select: { email: true } },
      threadId: true,
      messageId: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { messageId: true } }
    },
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

import { formatMeetingTime } from "@/lib/utils/datetime";



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
    
    if (meeting.status === "CANCELLED") {
      return NextResponse.json({ error: "Meeting is already cancelled" }, { status: 400 });
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
    } = validation.data;

    // Authorization: only the host can mutate meeting details
    const isHost = session.user.id === meeting.createdById;
    const isMutatingDetails = title !== undefined || description !== undefined || startTime !== undefined || endTime !== undefined || ticketId !== undefined || attendeeIds !== undefined;
    
    if (isMutatingDetails && !isHost) {
      return NextResponse.json({ error: "Forbidden: only the host can update meeting details" }, { status: 403 });
    }

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
    if (isRescheduling || attendeeIds !== undefined) {
      // Incorporate attendee changes if provided, otherwise preserve existing attendees
      const participantIds = (attendeeIds !== undefined 
        ? [meeting.createdById, ...attendeeIds] 
        : meeting.attendees.map((a) => a.userId)).filter((id): id is string => typeof id === "string");

      const conflictingMeeting = await prisma.meeting.findFirst({
        where: {
          id: { not: id }, // Exclude this meeting from self-conflict
          attendees: {
            some: {
              userId: { in: participantIds },
            },
          },
          status: { not: "CANCELLED" },
          startTime: { lt: newEndDate },   // ExistingStart < NewEnd
          endTime:   { gt: newStartDate }, // ExistingEnd   > NewStart
        },
        select: { id: true, title: true, startTime: true, endTime: true },
      });

      if (conflictingMeeting) {
        return NextResponse.json(
          {
            error: `Scheduling conflict: a participant already has a non-cancelled meeting "${conflictingMeeting.title}" that overlaps with the requested time slot.`,
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
    // Apply updates inside a transaction (Rescheduling & Attendee updates)
    // -----------------------------------------------------------------------

    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Replace attendee list if provided (host row is preserved)
      if (attendeeIds !== undefined) {
        const currentMeeting = await tx.meeting.findUniqueOrThrow({
          where: { id },
          include: { attendees: true }
        });
        const existingNonHostIds = currentMeeting.attendees
          .filter(a => a.userId !== meeting.createdById)
          .map(a => a.userId)
          .filter((id): id is string => typeof id === "string");

        const addedIds = attendeeIds.filter(id => !existingNonHostIds.includes(id) && id !== meeting.createdById);
        const removedIds = existingNonHostIds.filter(id => !attendeeIds.includes(id));

        if (removedIds.length > 0) {
          await tx.meetingAttendee.deleteMany({
            where: {
              meetingId: id,
              userId: { in: removedIds },
            },
          });
        }
        if (addedIds.length > 0) {
          await tx.meetingAttendee.createMany({
            data: addedIds.map((uid) => ({
              meetingId: id,
              userId:    uid,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3. Update the Meeting record itself
      return await tx.meeting.update({
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

    const updatedMeeting = txResult;

    // -----------------------------------------------------------------------
    // Re-dispatch invitations or cancellations based on diff
    // -----------------------------------------------------------------------
    if (updatedMeeting.ticketId && isRescheduling) {
      const ticketForEmail = await prisma.ticket.findUnique({
        where: { id: updatedMeeting.ticketId },
        select: { 
          id: true, 
          title: true, 
          contactEmail: true, 
          ccEmails: true, 
          threadId: true,
          messageId: true,
          createdById: true,
          createdBy: { select: { email: true } },
          assignedTo: { select: { email: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { messageId: true } }
        },
      });

      if (ticketForEmail) {
        const startStr = formatMeetingTime(newStartDate);
        const duration = Math.round((newEndDate.getTime() - newStartDate.getTime()) / 60000);
        const content = `🔄 **Meeting Rescheduled**\n\nThe Google Meet session has been rescheduled:\n* **New Time:** ${startStr}\n* **Duration:** ${duration} minutes\n\n🔗 **[Join Google Meet Room](${updatedMeeting.meetingUrl})**`;

        const rendered = EmailTemplates.renderMeetingScheduled({
          ticketTitle: ticketForEmail.title,
          startTime: startStr,
          duration,
          meetUrl: updatedMeeting.meetingUrl || "",
          hostName: session.user.name || "Support Team",
          ticketId: ticketForEmail.id,
        });

        const message = await prisma.ticketMessage.create({
          data: {
            ticketId: updatedMeeting.ticketId,
            senderType: "AGENT",
            senderEmail: session.user.email || "agent@ticketflow",
            content,
          },
        });

        revalidatePath("/tickets");
        revalidatePath(`/tickets/${updatedMeeting.ticketId}`);
        revalidateTag(`ticket-${updatedMeeting.ticketId}`, "max");
        revalidateTag("tickets", "max");
        revalidateTag(`meetings`, "max");

        if (updatedMeeting.status === "CANCELLED") {
          broadcastTicketMutation(updatedMeeting.ticketId, "MEETING_CANCELLED");
        } else {
          broadcastTicketMutation(updatedMeeting.ticketId, "MEETING_SCHEDULED");
        }

        try {
          const { messageId, threadId } = await sendTicketReplyEmail({
            ticket: ticketForEmail,
            messageContent: rendered.plainText,
            htmlOverride: rendered.html,
            senderName: session.user.name || "TicketFlow Agent",
          });
          if (messageId || threadId) {
            await prisma.ticketMessage.update({
              where: { id: message.id },
              data: { 
                ...(messageId ? { messageId } : {}),
                ...(threadId ? { threadId } : {}),
              },
            });
          }
          if (threadId) {
            await prisma.ticket.update({
              where: { id: ticketForEmail.id },
              data: { threadId },
            });
          }
        } catch (err) {
          console.error("[PATCH /api/meetings/[id]] Email dispatch failed:", err);
        }
      }
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

    // STRICT 403 GUARD: caller must be a participant OR ticket creator OR ticket contact
    const isParticipant = meeting.attendees.some((a) => a.userId === session.user.id);
    const isHost = meeting.createdById === session.user.id;
    const isTicketCreator = meeting.ticket?.createdById === session.user.id;
    const isTicketContact = meeting.ticket?.contactEmail && session.user.email && meeting.ticket.contactEmail === session.user.email;
    
    if (!isParticipant && !isTicketCreator && !isTicketContact) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the meeting host or the main client can cancel the entire meeting
    if (!isHost && !isTicketCreator && !isTicketContact) {
      return NextResponse.json(
        { error: "Forbidden: only the meeting host or main client can cancel this meeting" },
        { status: 403 }
      );
    }

    if (meeting.status === "CANCELLED") {
      return NextResponse.json(
        { message: "Meeting already cancelled" },
        { status: 200 }
      );
    }

    // 1. Database Operations
    // Soft-delete the meeting by updating status to CANCELLED
    await prisma.meeting.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
    // (Soft-delete propagates logic naturally for our use case without needing attendee cascading)

    // 2. External Network Side-Effects
    if (meeting.externalGoogleEventId) {
      try {
        await deleteGoogleMeetRoom(meeting.externalGoogleEventId);
      } catch (err) {
        console.error("[DELETE /api/meetings/[id]] Failed to delete Google Meet room:", err);
      }
    }

    if (meeting.ticket) {
      const startStr = formatMeetingTime(meeting.startTime);
      
      const cancelActor = session.user.name || session.user.email || "a participant";
      const rendered = EmailTemplates.renderMeetingCancelled({
        ticketTitle: meeting.ticket.title,
        startTime: startStr,
        cancellerName: cancelActor,
        ticketId: meeting.ticket.id,
      });

      const content = `🚫 Google Meet Session Cancelled\n\nThe scheduled video session for ${startStr} has been cancelled by ${cancelActor}. The room has been dissolved.`;

      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: meeting.ticketId!,
          senderType: "AGENT",
          senderEmail: session.user.email || "agent@ticketflow",
          content,
        },
      });

      revalidatePath("/tickets");
      revalidatePath(`/tickets/${meeting.ticketId}`);
      revalidateTag(`ticket-${meeting.ticketId}`, "max");
      revalidateTag("tickets", "max");
      revalidateTag(`meetings`, "max");
      broadcastTicketMutation(meeting.ticketId!, "MEETING_CANCELLED");

      try {
        const { messageId, threadId } = await sendTicketReplyEmail({
          ticket: meeting.ticket,
          messageContent: rendered.plainText,
          htmlOverride: rendered.html,
          senderName: session.user.name || "TicketFlow Agent",
        });
        if (messageId || threadId) {
          await prisma.ticketMessage.update({
            where: { id: message.id },
            data: { 
              ...(messageId ? { messageId } : {}),
              ...(threadId ? { threadId } : {}),
            },
          });
        }
        if (threadId) {
          await prisma.ticket.update({
            where: { id: meeting.ticket.id },
            data: { threadId },
          });
        }
      } catch (err) {
        console.error("[DELETE /api/meetings/[id]] Email dispatch failed:", err);
      }
    }

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
