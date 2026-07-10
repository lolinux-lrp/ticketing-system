/**
 * @file meeting.ts
 * @description Centralized domain types for the in-app meeting scheduling system.
 *
 * All meeting-related TypeScript interfaces and types are declared here.
 * Feature files must import from this module; do NOT declare local meeting types.
 */

import type {
  Meeting as PrismaMeeting,
  MeetingAttendee as PrismaMeetingAttendee,
  AttendeeStatus as PrismaAttendeeStatus,
} from "@prisma/client";

import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Enum / Union types
// ---------------------------------------------------------------------------

/** Re-exported Prisma enum for use across the application. */
export { AttendeeStatus } from "@prisma/client";

/**
 * Union literal type mirroring the `AttendeeStatus` Prisma enum.
 * Prefer this in API payload types and function signatures for
 * better structural compatibility with JSON deserialization.
 */
export type AttendeeStatusValue =
  | "ACCEPTED"
  | "DECLINED"
  | "PENDING"
  | "CANCELLED";

// ---------------------------------------------------------------------------
// User shapes
// ---------------------------------------------------------------------------

/**
 * Minimal user projection used inside meeting attendee and host fields.
 * Carries only what is needed for the calendar UI and email dispatchers.
 */
export interface MeetingAttendeeUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
}

// ---------------------------------------------------------------------------
// Core meeting shapes
// ---------------------------------------------------------------------------

/**
 * A single attendee record enriched with user details.
 */
export interface MeetingAttendeeWithUser
  extends Omit<PrismaMeetingAttendee, "status"> {
  status: PrismaAttendeeStatus;
  user: MeetingAttendeeUser;
}

/**
 * Full meeting record including the host and attendee list.
 * Used by the calendar UI and email dispatchers.
 *
 * Dates are kept as `Date` objects (not serialized strings) at the
 * service / server-component layer. Serialize them to ISO strings at
 * the API boundary as needed.
 */
export interface MeetingWithAttendees extends PrismaMeeting {
  createdBy: MeetingAttendeeUser;
  attendees: MeetingAttendeeWithUser[];
}

// ---------------------------------------------------------------------------
// Input payload types
// ---------------------------------------------------------------------------

/**
 * Validated input shape for creating a new meeting.
 *
 * - `startTime` / `endTime` must be UTC ISO-8601 strings from the client;
 *   the service layer converts them to `Date` before writing to Prisma.
 * - `attendeeIds` is the list of user IDs to invite (excluding the host).
 * - `meetingUrl` is populated by the Google Calendar integration later;
 *   pass an empty string `""` until the Meet link is generated.
 */
export interface CreateMeetingPayload {
  title: string;
  description?: string;
  /** UTC ISO-8601 string, e.g. "2026-07-10T09:00:00Z" */
  startTime: string;
  /** UTC ISO-8601 string, e.g. "2026-07-10T10:00:00Z" */
  endTime: string;
  /** Google Meet URL — populated after event creation; pass "" initially. */
  meetingUrl: string;
  /** Optional ID of the associated support ticket. */
  ticketId?: string;
  /** User ID of the meeting host (the caller's session ID). */
  createdById: string;
  /** User IDs of non-host attendees to invite. */
  attendeeIds: string[];
  /** Optional array of teammate user IDs to invite */
  teammateIds?: string[];
}

/**
 * Validated input shape for updating an existing meeting.
 * All fields are optional; only provided fields will be mutated.
 */
export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  /** UTC ISO-8601 string */
  startTime?: string;
  /** UTC ISO-8601 string */
  endTime?: string;
  meetingUrl?: string;
  externalGoogleEventId?: string;
  ticketId?: string | null;
  /** Full replacement list of attendee user IDs (excluding host). */
  attendeeIds?: string[];
  /** Attendee-level RSVP status update */
  attendeeStatus?: AttendeeStatusValue;
}

// ---------------------------------------------------------------------------
// Email payload type
// ---------------------------------------------------------------------------

/**
 * Attendee entry used inside `MeetingEmailPayload`.
 * Email and name may be null for accounts that have not completed onboarding.
 */
export interface EmailAttendeeEntry {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Ticket context included when a meeting is linked to a support ticket.
 */
export interface MeetingTicketContext {
  ticketId: string;
  ticketTitle: string;
}

/**
 * Payload handed to the email dispatcher in Stage 2.
 * Fully self-contained so the template renderer has no Prisma dependency.
 *
 * - All datetimes are pre-formatted UTC ISO-8601 strings.
 * - `attendees` excludes the host; iterate both for "all participants".
 */
export interface MeetingEmailPayload {
  /** Human-readable meeting title. */
  title: string;
  /** Optional description / agenda. */
  description?: string;
  /** UTC ISO-8601 string, e.g. "2026-07-10T09:00:00.000Z" */
  startTimeUtc: string;
  /** UTC ISO-8601 string, e.g. "2026-07-10T10:00:00.000Z" */
  endTimeUtc: string;
  /** Google Meet join URL. */
  meetingUrl: string;
  /** Meeting host details. */
  host: EmailAttendeeEntry;
  /** Non-host attendees to whom the email will be dispatched. */
  attendees: EmailAttendeeEntry[];
  /** Populated when the meeting is associated with a support ticket. */
  ticketContext?: MeetingTicketContext;
  /** Optional override for the ICS method (defaults to "REQUEST"). */
  method?: "REQUEST" | "CANCEL";
  /** Optional override for the ICS status (defaults to "CONFIRMED"). */
  status?: "CONFIRMED" | "CANCELLED";
}
