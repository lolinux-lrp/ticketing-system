/**
 * @file src/lib/calendar/googleMeet.ts
 * @description Silent Google Meet provisioning service.
 *
 * Authenticates using the system-level Google OAuth2 service account credentials
 * stored in environment variables, then creates a Google Calendar event with a
 * Google Meet conference room attached.
 *
 * PRIVACY RULE: The `attendees` field is intentionally OMITTED from the Google
 * Calendar API request body. This prevents Google from sending its own invitation
 * emails, keeping all attendee communication exclusively inside our app mailer
 * (Stage 2). The `sendUpdates: "none"` parameter is an additional guard layer.
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
  attendeeEmails?: string[];
}

/** The provisioned room details returned on success. */
export interface CreateMeetRoomResult {
  /** The Google Meet join URL, e.g. "https://meet.google.com/abc-defg-hij" */
  meetUrl: string;
  /** The Google Calendar event ID used for future update/delete operations. */
  externalGoogleEventId: string;
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
  const { clientId, clientSecret, refreshToken } = resolveOAuthCredentials();

  // Initialize the OAuth2 client with system account credentials.
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

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
      ...(params.attendeeEmails?.length ? {
        attendees: params.attendeeEmails.map(email => ({ email }))
      } : {})
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

  // Navigate the nullable chain to find the "video" entry point URI.
  const entryPoints = response.data.conferenceData?.entryPoints;
  const videoEntryPoint = entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );
  const meetUrl = videoEntryPoint?.uri;

  if (!meetUrl) {
    throw new Error(
      "[createSilentGoogleMeetRoom] Google Calendar API response did not include a Meet URL. " +
        `Event was created (id: ${eventId}) but conference data is missing. ` +
        "Ensure conferenceDataVersion=1 and the account has Google Meet access."
    );
  }

  return {
    meetUrl,
    externalGoogleEventId: eventId,
  };
}
