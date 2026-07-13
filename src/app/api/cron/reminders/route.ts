import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMeetingReminderEmail } from "@/lib/email";
import type { MeetingEmailPayload } from "@/types/meeting";

export async function GET(req: NextRequest) {
  try {
    // 1. Strict Security Check
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("[Cron Reminders] CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.warn("[Cron Reminders] Unauthorized access attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Time Window Calculation (15 minutes from now, with a 1-minute buffer)
    const now = new Date();
    // targetTime = now + 15 minutes
    const targetTime = new Date(now.getTime() + 15 * 60 * 1000);
    // 1 minute before target
    const windowStart = new Date(targetTime.getTime() - 60 * 1000);
    // 1 minute after target
    const windowEnd = new Date(targetTime.getTime() + 60 * 1000);

    // 3. Database Query
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        startTime: {
          gte: windowStart,
          lte: windowEnd,
        },
        reminderSentAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        attendees: {
          where: {
            status: { in: ["ACCEPTED", "PENDING"] },
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        ticket: {
          select: { id: true, title: true },
        },
      },
    });

    if (upcomingMeetings.length === 0) {
      return NextResponse.json({ message: "No meetings found in this window." }, { status: 200 });
    }

    // 4. Dispatch Reminder Emails Concurrently
    const dispatchPromises = upcomingMeetings.map(async (meeting) => {
      // If there are no accepted/pending attendees (including the host), skip
      if (meeting.attendees.length === 0) return;

      // Atomically claim the meeting
      const claim = await prisma.meeting.updateMany({
        where: { id: meeting.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() }
      });

      if (claim.count === 0) return; // Already claimed by another invocation

      const emailPayload: MeetingEmailPayload = {
        meetingId: meeting.id,
        sequence: Math.floor(new Date(meeting.updatedAt).getTime() / 1000),
        title: meeting.title,
        description: meeting.description ?? undefined,
        startTimeUtc: meeting.startTime.toISOString(),
        endTimeUtc: meeting.endTime.toISOString(),
        meetingUrl: meeting.meetingUrl,
        host: {
          id: meeting.createdBy.id,
          name: meeting.createdBy.name,
          email: meeting.createdBy.email,
        },
        attendees: meeting.attendees
          .filter((a) => a.userId !== meeting.createdById)
          .map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
          })),
        ticketContext: meeting.ticket
          ? { ticketId: meeting.ticket.id, ticketTitle: meeting.ticket.title }
          : undefined,
      };

      await sendMeetingReminderEmail(emailPayload);
    });

    const results = await Promise.allSettled(dispatchPromises);
    const rejectedCount = results.filter((r) => r.status === "rejected").length;

    if (rejectedCount > 0) {
      return NextResponse.json(
        { error: "Some reminders failed to send", rejectedCount },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `Successfully processed ${upcomingMeetings.length} meeting reminders.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Cron Reminders] Execution error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
