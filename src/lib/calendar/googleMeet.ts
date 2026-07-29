/**
 * @file src/lib/calendar/googleMeet.ts
 * @description Silent Google Meet provisioning service.
 *
 * Authenticates using the system-level Google OAuth2 service account credentials
 * stored in environment variables, then creates a Google Calendar event with a
 * Google Meet conference room attached.
 *
 * PRIVACY RULE: The `attendees` field is OMITTED from the initial `events.insert`
 * call to prevent Google from sending its own invitation emails. After our database
 * records are persisted, `patchGoogleMeetAttendees` is called to register the
 * participant email list so Google Meet grants them direct "Join now" entry instead
 * of routing them to the waiting room. `sendUpdates: "none"` is passed on every
 * call to suppress all Google-side notifications.
 */

import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Strict input parameters for provisioning a Google Meet room. */
export interface CreateMeetRoomParams {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

/** The provisioned room details returned on success. */
export interface CreateMeetRoomResult {
  /** The Google Meet join URL, e.g. "https://meet.google.com/abc-defg-hij" */
  meetUrl: string;
  /** The Google Calendar event ID used for future update/delete operations. */
  externalGoogleEventId: string;
}

/** Input for patching attendees onto an existing Google Calendar event. */
export interface PatchMeetAttendeesParams {
  /** The Google Calendar event ID returned by createSilentGoogleMeetRoom. */
  externalGoogleEventId: string;
  /** Flat list of every participant email address (host + all invitees). */
  attendeeEmails: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads and validates the three required OAuth2 environment variables.
 * Throws a descriptive error at the call site if any are missing so that
 * misconfigured deployments surface a meaningful message immediately.
 */
function resolveOAuthCredentials(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId) {
    throw new Error(
      "[createSilentGoogleMeetRoom] Missing required env var: GOOGLE_CLIENT_ID"
    );
  }
  if (!clientSecret) {
    throw new Error(
      "[createSilentGoogleMeetRoom] Missing required env var: GOOGLE_CLIENT_SECRET"
    );
  }
  if (!refreshToken) {
    throw new Error(
      "[createSilentGoogleMeetRoom] Missing required env var: GOOGLE_REFRESH_TOKEN"
    );
  }

  return { clientId, clientSecret, refreshToken };
}

function getCalendarClient() {
  const { clientId, clientSecret, refreshToken } = resolveOAuthCredentials();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Silently provisions a Google Meet room by creating a private Google Calendar
 * event on the system account and extracting the generated Meet link.
 *
 * **Attendees are deliberately excluded** from the API payload to prevent Google
 * from dispatching its own invitation emails. All attendee notifications are
 * handled by `sendMeetingInvitationEmail` in Stage 2.
 *
 * @param params - Title, start/end time, and optional description for the event.
 * @returns An object containing the Meet join URL and the Google Calendar event ID.
 *
 * @throws If any required OAuth2 env vars are missing.
 * @throws If the Google Calendar API returns an error.
 * @throws If the API response does not include a Meet URL or event ID.
 */
export async function createSilentGoogleMeetRoom(
  params: CreateMeetRoomParams
): Promise<CreateMeetRoomResult> {
  const calendar = getCalendarClient();

  // Call the Calendar API to create an event with a Meet conference room.
  // CRITICAL: `attendees` is intentionally absent from requestBody.
  // CRITICAL: `sendUpdates: "none"` prevents Google from sending its own emails.
  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1, // Required: instructs Google to generate a Meet link.
    sendUpdates: "none",      // Critical: suppresses all Google-side notifications.
    requestBody: {
      summary: params.title,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Response parsing with explicit narrowing
  // ---------------------------------------------------------------------------

  const eventId = response.data.id;
  if (!eventId) {
    throw new Error(
      "[createSilentGoogleMeetRoom] Google Calendar API response did not include an event ID. " +
        "Room provisioning failed."
    );
  }

  let eventData = response.data;
  let attempts = 0;

  while (
    attempts < 5 &&
    eventData.conferenceData?.createRequest?.status?.statusCode === "pending"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempts + 1)));
    const getRes = await calendar.events.get({ calendarId: "primary", eventId });
    eventData = getRes.data;
    attempts++;
  }

  // Navigate the nullable chain to find the "video" entry point URI.
  const entryPoints = eventData.conferenceData?.entryPoints;
  const videoEntryPoint = entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );
  const meetUrl = videoEntryPoint?.uri;

  if (!meetUrl) {
    let cleanupSucceeded = false;
    try {
      await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "none" });
      cleanupSucceeded = true;
    } catch {
      // Capture cleanup failure but continue to throw the primary error
    }

    throw new Error(
      "[createSilentGoogleMeetRoom] Google Calendar API response did not include a Meet URL. " +
        `Event was created (id: ${eventId}) but conference data is missing or pending too long. ` +
        (cleanupSucceeded
          ? "Orphaned event has been cleaned up."
          : "Failed to clean up orphaned event.")
    );
  }

  return {
    meetUrl,
    externalGoogleEventId: eventId,
  };
}

/**
 * Patches an existing Google Calendar event to register the full attendee list.
 *
 * This must be called AFTER the meeting is persisted in the database so that all
 * participant emails are available. Google Meet uses this attendee list to decide
 * who receives direct "Join now" access vs. the "Ask to join" waiting-room prompt.
 *
 * `sendUpdates: "none"` ensures Google does NOT dispatch its own calendar
 * invitation emails — all attendee notifications are handled by our Nodemailer
 * dispatchers in `src/lib/email.ts`.
 *
 * @param params.externalGoogleEventId - The Calendar event ID to patch.
 * @param params.attendeeEmails - All participant emails (host + invitees).
 */
export async function patchGoogleMeetAttendees(
  params: PatchMeetAttendeesParams
): Promise<void> {
  const calendar = getCalendarClient();

  const uniqueEmails = Array.from(new Set(params.attendeeEmails)).filter(Boolean);
  if (uniqueEmails.length === 0) return;

  await calendar.events.patch({
    calendarId: "primary",
    eventId: params.externalGoogleEventId,
    sendUpdates: "none", // Critical: suppress ALL Google-side notifications
    requestBody: {
      attendees: uniqueEmails.map((email) => ({ email })),
    },
  });
}

/**
 * Deletes a Google Meet room by removing the underlying Google Calendar event.
 *
 * @param externalGoogleEventId - The Google Calendar event ID to delete.
 * @throws If any required OAuth2 env vars are missing.
 * @throws If the Google Calendar API returns an error.
 */
export async function deleteGoogleMeetRoom(externalGoogleEventId: string): Promise<void> {
  const calendar = getCalendarClient();

  await calendar.events.delete({
    calendarId: "primary",
    eventId: externalGoogleEventId,
    sendUpdates: "none", // Prevent Google from sending cancellation emails
  });
}
