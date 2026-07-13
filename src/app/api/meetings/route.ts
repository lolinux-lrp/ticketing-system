import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMeetingSchema } from "@/lib/validations/meetings";
import { createSilentGoogleMeetRoom } from "@/lib/calendar/googleMeet";
import { sendMeetingInvitationEmail } from "@/lib/email";
import type {
  MeetingEmailPayload,
  MeetingWithAttendees,
} from "@/types/meeting";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Prisma select shape — used in both GET and POST to produce MeetingWithAttendees
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
} as const;

// ---------------------------------------------------------------------------
// GET /api/meetings — fetch the authenticated user's meetings (privacy-scoped)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT PRIVACY RULE: only return meetings where the caller is an attendee.
    // Never expose a platform-wide master schedule.
    const meetings = await prisma.meeting.findMany({
      where: {
        attendees: {
          some: { userId: session.user.id },
        },
      },
      include: MEETING_INCLUDE,
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(
      { data: meetings as MeetingWithAttendees[] },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/meetings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/meetings — schedule a new meeting
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse & validate request body ---
    const body: unknown = await req.json();
    const validation = createMeetingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, startTime, endTime, ticketId, attendeeIds, teammateIds } =
      validation.data;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Always use the session user as the host — never trust a client-supplied createdById
    const createdById = session.user.id;

    // --- Authorize ticketId ---
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { createdById: true, assignedToId: true }
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      if (session.user.role === "CUSTOMER" && ticket.createdById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: Not authorized to link this ticket" }, { status: 403 });
      }
      if (session.user.role === "AGENT" && ticket.assignedToId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: Not authorized to link this ticket" }, { status: 403 });
      }
    }

    // -----------------------------------------------------------------------
    // CONFLICT ENGINE — Double-booking prevention
    // An overlap exists when:  ExistingStart < NewEnd  AND  ExistingEnd > NewStart
    //
    // Applied to the host AND to every invited attendee to prevent either party
    // from being double-booked.
    // -----------------------------------------------------------------------
    // Combine attendeeIds and teammateIds
    const combinedInvitees = [...attendeeIds, ...(teammateIds || [])];
    const allParticipantIds = [createdById, ...combinedInvitees];
    // -----------------------------------------------------------------------
    // Step 1: Provision the Google Meet room silently (no Google emails sent)
    // -----------------------------------------------------------------------
    const { meetUrl, externalGoogleEventId } =
      await createSilentGoogleMeetRoom({
        title,
        startTime: startDate,
        endTime: endDate,
        description,
      });

    // -----------------------------------------------------------------------
    // Step 2: Persist Meeting + MeetingAttendee records in a single transaction
    // -----------------------------------------------------------------------

    const uniqueAttendeeIds = Array.from(new Set(combinedInvitees)).filter(uid => uid !== createdById);

    // Build the attendee create list: host first (ACCEPTED), then invitees (PENDING)
    const attendeeCreateData = [
      { userId: createdById, status: "ACCEPTED" as const },
      ...uniqueAttendeeIds.map((uid) => ({
        userId: uid,
        status: "PENDING" as const,
      })),
    ];

    let newMeeting: MeetingWithAttendees;

    try {
      newMeeting = await prisma.$transaction(async (tx) => {
        // Run the conflict check inside the transaction with serializable isolation (handled by Prisma defaults or retries)
        const conflictingMeeting = await tx.meeting.findFirst({
          where: {
            attendees: {
              some: {
                userId: { in: allParticipantIds },
                status: { in: ["ACCEPTED", "PENDING"] },
              },
            },
            startTime: { lt: endDate },
            endTime:   { gt: startDate },
          },
          select: { id: true, title: true, startTime: true, endTime: true },
        });

        if (conflictingMeeting) {
          throw new Error(JSON.stringify({
            code: 409,
            error: `Scheduling conflict: a participant already has an accepted or pending meeting "${conflictingMeeting.title}" that overlaps with the requested time slot.`,
            conflict: {
              meetingId: conflictingMeeting.id,
              startTime: conflictingMeeting.startTime.toISOString(),
              endTime:   conflictingMeeting.endTime.toISOString(),
            },
          }));
        }

        return tx.meeting.create({
          data: {
            title,
            description,
            startTime: startDate,
            endTime: endDate,
            meetingUrl: meetUrl,
            externalGoogleEventId,
            ...(ticketId ? { ticketId } : {}),
            createdById,
            attendees: {
              create: attendeeCreateData,
            },
          },
          include: MEETING_INCLUDE,
        });
      }, {
        isolationLevel: 'Serializable'
      });
    } catch (error: unknown) {
      if (externalGoogleEventId) {
        const { deleteGoogleMeetRoom } = await import("@/lib/calendar/googleMeet");
        await deleteGoogleMeetRoom(externalGoogleEventId).catch(err => console.error("Failed to delete orphaned Google Meet event:", err));
      }
      try {
        if (error instanceof Error) {
          const parsed = JSON.parse(error.message);
          if (parsed.code === 409) {
            return NextResponse.json({ error: parsed.error, conflict: parsed.conflict }, { status: 409 });
          }
        }
      } catch {
        // Not our custom JSON error
      }
      throw error;
    }

    // -----------------------------------------------------------------------
    // Step 3: Fetch ticket context (if linked) and dispatch invitation emails
    // -----------------------------------------------------------------------

    let ticketContext: MeetingEmailPayload["ticketContext"] = undefined;
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, title: true },
      });
      if (ticket) {
        ticketContext = { ticketId: ticket.id, ticketTitle: ticket.title };
      }
    }

    const emailPayload: MeetingEmailPayload = {
      meetingId: newMeeting.id,
      sequence: Math.floor(new Date(newMeeting.updatedAt).getTime() / 1000),
      title: newMeeting.title,
      description: newMeeting.description ?? undefined,
      startTimeUtc: newMeeting.startTime.toISOString(),
      endTimeUtc:   newMeeting.endTime.toISOString(),
      meetingUrl:   newMeeting.meetingUrl,
      host: {
        id:    newMeeting.createdBy.id,
        name:  newMeeting.createdBy.name,
        email: newMeeting.createdBy.email,
      },
      attendees: newMeeting.attendees
        .filter((a) => a.userId !== createdById)
        .map((a) => ({
          id:    a.user.id,
          name:  a.user.name,
          email: a.user.email,
        })),
      ticketContext,
    };

    // Fire-and-forget — email dispatch must not block the HTTP response
    sendMeetingInvitationEmail(emailPayload).catch((err) =>
      console.error("[POST /api/meetings] Email dispatch failed:", err)
    );

    return NextResponse.json(
      { data: newMeeting as MeetingWithAttendees },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/meetings] Error:", error);
    return NextResponse.json(
      { error: "Failed to schedule meeting" },
      { status: 500 }
    );
  }
}
