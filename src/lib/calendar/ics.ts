/**
 * @file src/lib/calendar/ics.ts
 * @description Utility for generating iCalendar (.ics) file strings from a
 * `MeetingEmailPayload`. The output is intended to be bundled as a MIME
 * attachment (content-type: text/calendar; method=REQUEST) in meeting emails.
 *
 * Depends on the `ics` package (ships its own type declarations — no @types/ics needed).
 */

import { createEvent } from "ics";
import type { EventAttributes, Attendee as IcsAttendee } from "ics";
import type { MeetingEmailPayload } from "@/types/meeting";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a UTC ISO-8601 string into the `[year, month, day, hour, minute]`
 * tuple that the `ics` library expects for UTC date-time fields.
 */
function isoToDateArray(
  isoString: string
): [number, number, number, number, number] {
  const d = new Date(isoString);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1, // ics uses 1-indexed months
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a valid iCalendar (RFC 5545) string for a meeting invitation.
 *
 * The `.ics` string can be attached to an email as:
 * ```
 * {
 *   filename: "invite.ics",
 *   content: icsString,
 *   contentType: "text/calendar; method=REQUEST",
 * }
 * ```
 *
 * @throws If `process.env.DEFAULT_FROM_EMAIL` is not set.
 * @throws If the `ics` library returns an error during generation.
 */
export function createMeetingIcsAttachment(
  payload: MeetingEmailPayload
): string {
  const organizerEmail = process.env.DEFAULT_FROM_EMAIL;
  if (!organizerEmail) {
    throw new Error(
      "[createMeetingIcsAttachment] Missing required env var: DEFAULT_FROM_EMAIL"
    );
  }

  // Map attendees (excluding host — host is the organizer)
  const attendees: IcsAttendee[] = payload.attendees
    .filter((a): a is typeof a & { email: string } => a.email !== null)
    .map(
      (a): IcsAttendee => ({
        name: a.name ?? undefined,
        email: a.email,
        rsvp: true,
        role: "REQ-PARTICIPANT",
        partstat: "NEEDS-ACTION",
      })
    );

  // Also add the host as a CHAIR attendee so calendar clients show the full roster
  const hostEmail = payload.host.email;
  if (hostEmail) {
    attendees.unshift({
      name: payload.host.name ?? undefined,
      email: hostEmail,
      rsvp: false,
      role: "CHAIR",
      partstat: "ACCEPTED",
    });
  }

  // Build the description, including ticket context if present
  const descriptionParts: string[] = [];
  if (payload.description) {
    descriptionParts.push(payload.description);
  }
  if (payload.ticketContext) {
    descriptionParts.push(
      `Linked Ticket: ${payload.ticketContext.ticketTitle} (#${payload.ticketContext.ticketId})`
    );
  }
  if (payload.meetingUrl) {
    descriptionParts.push(`Join the meeting: ${payload.meetingUrl}`);
  }

  const eventAttributes: EventAttributes = {
    title: payload.title,
    description: descriptionParts.join("\n\n") || undefined,
    start: isoToDateArray(payload.startTimeUtc),
    startInputType: "utc",
    startOutputType: "utc",
    end: isoToDateArray(payload.endTimeUtc),
    endInputType: "utc",
    endOutputType: "utc",
    url: payload.meetingUrl || undefined,
    status: payload.status || "CONFIRMED",
    busyStatus: "BUSY",
    organizer: {
      name: "TicketFlow",
      email: organizerEmail,
    },
    attendees: attendees.length > 0 ? attendees : undefined,
    // REQUEST method signals an invite; CANCEL signals cancellation
    method: payload.method || "REQUEST",
    productId: "TicketFlow/meeting-scheduler",
  };

  const { error, value } = createEvent(eventAttributes);

  if (error) {
    throw new Error(
      `[createMeetingIcsAttachment] ICS generation failed: ${error.message}`
    );
  }

  if (!value) {
    throw new Error(
      "[createMeetingIcsAttachment] ICS generation returned an empty value."
    );
  }

  return value;
}
