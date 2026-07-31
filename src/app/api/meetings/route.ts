import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { broadcastTicketMutation } from "@/lib/realtime/emitter";
import { prisma } from "@/lib/prisma";
import { createMeetingSchema } from "@/lib/validations/meetings";
import { createSilentGoogleMeetRoom, patchGoogleMeetAttendees } from "@/lib/calendar/googleMeet";
import { sendTicketReplyEmail } from "@/lib/email";
import { EmailTemplates } from "@/lib/email-templates";
import { formatMeetingTime } from "@/lib/utils/datetime";
import { MeetingWithAttendees } from "@/types/meeting";

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
    let ticketForEmail = null;
    if (ticketId) {
      ticketForEmail = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { 
          createdById: true, 
          assignedToId: true,
          id: true, 
          title: true, 
          threadId: true, 
          messageId: true,
          contactEmail: true,
          ccEmails: true,
          assignedTo: { select: { email: true } },
          createdBy: { select: { email: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { messageId: true } } 
        }
      });

      if (!ticketForEmail) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      if (session.user.role === "CUSTOMER" && ticketForEmail.createdById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: Not authorized to link this ticket" }, { status: 403 });
      }
      if (session.user.role === "USER" && ticketForEmail.assignedToId !== session.user.id) {
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

    // Build the attendee create list
    const attendeeCreateData = [
      { userId: createdById },
      ...uniqueAttendeeIds.map((uid) => ({
        userId: uid,
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
              },
            },
            status: { not: "CANCELLED" },
            startTime: { lt: endDate },
            endTime:   { gt: startDate },
          },
          select: { id: true, title: true, startTime: true, endTime: true },
        });

        if (conflictingMeeting) {
          throw new Error(JSON.stringify({
            code: 409,
            error: `Scheduling conflict: a participant already has a non-cancelled meeting "${conflictingMeeting.title}" that overlaps with the requested time slot.`,
            conflict: {
              meetingId: conflictingMeeting.id,
              startTime: conflictingMeeting.startTime.toISOString(),
              endTime:   conflictingMeeting.endTime.toISOString(),
            },
          }));
        }

        const createdMeeting = await tx.meeting.create({
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



        return createdMeeting;
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
    // Step 3: Fetch ticket context (if linked) for email routing and whitelist
    // -----------------------------------------------------------------------
    // (ticketForEmail already fetched above during authorization)

    // -----------------------------------------------------------------------
    // Step 4: Patch the Google Calendar event attendees list so Meet grants
    // direct "Join now" access. We include all stakeholders from the ticket.
    // -----------------------------------------------------------------------
    const allParticipantEmails = new Set<string>([
      newMeeting.createdBy.email,
      ...newMeeting.attendees.map((a) => a.email || a.user?.email)
    ].filter((e): e is string => Boolean(e)));

    if (ticketForEmail) {
      if (ticketForEmail.contactEmail) allParticipantEmails.add(ticketForEmail.contactEmail);
      if (ticketForEmail.createdBy?.email) allParticipantEmails.add(ticketForEmail.createdBy.email);
      if (ticketForEmail.assignedTo?.email) allParticipantEmails.add(ticketForEmail.assignedTo.email);
      if (ticketForEmail.ccEmails) {
        ticketForEmail.ccEmails.forEach((email: string) => allParticipantEmails.add(email));
      }
    }

    patchGoogleMeetAttendees({
      externalGoogleEventId,
      attendeeEmails: Array.from(allParticipantEmails),
    }).catch((err) =>
      console.error("[POST /api/meetings] Failed to patch Meet attendees (non-critical):", err)
    );

    // -----------------------------------------------------------------------
    // Step 5: Dispatch invitation email (Link Drop)
    // -----------------------------------------------------------------------

    if (ticketForEmail && ticketId) {
      const startStr = formatMeetingTime(startDate);
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      
      const rendered = EmailTemplates.renderMeetingScheduled({
        ticketTitle: ticketForEmail.title,
        startTime: startStr,
        duration,
        meetUrl,
        hostName: session.user.name || "Support Team",
        ticketId: ticketForEmail.id,
      });

      const content = `📅 Live Google Meet Session Scheduled\n\nStart Time: ${startStr}\nDuration: ${duration} minutes\nLink: ${meetUrl}`;

      const message = await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderType: "AGENT",
          senderEmail: session.user.email || "agent@ticketflow",
          content,
        },
      });

      revalidatePath("/tickets");
      revalidatePath(`/tickets/${ticketId}`);
      revalidateTag("tickets", "max");
      revalidateTag(`ticket-${ticketId}`, "max");
      revalidateTag(`meetings`, "max");

      broadcastTicketMutation(ticketId, "MEETING_SCHEDULED");

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
        if (!ticketForEmail.threadId && threadId) {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { threadId },
          });
        }
      } catch (err) {
        console.error("[POST /api/meetings] Email dispatch failed:", err);
      }
    }

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
