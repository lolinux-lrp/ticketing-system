/**
 * @file src/lib/email/templates/meeting.ts
 * @description Modular HTML & plain-text email template for meeting invitations.
 *
 * This file is intentionally free of business logic and Prisma imports.
 * All data is received through the strictly-typed `MeetingEmailPayload`.
 * Modify the template copy and styling here without touching the mailer.
 */

import type { MeetingEmailPayload } from "@/types/meeting";

// ---------------------------------------------------------------------------
// Design tokens — update here to restyle all meeting emails globally.
// ---------------------------------------------------------------------------

const TOKEN = {
  /** Primary brand / CTA color */
  brand: "#6366f1",
  /** Slightly darker shade for hover-state descriptions */
  brandDark: "#4f46e5",
  /** Surface background for info cards */
  surface: "#f1f5f9",
  /** Subtle border for info cards */
  border: "#e2e8f0",
  /** Body text */
  textPrimary: "#1e293b",
  /** Secondary / meta text */
  textSecondary: "#64748b",
  /** White */
  white: "#ffffff",
  /** Font stack */
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a UTC ISO-8601 string into a human-readable date-time string.
 * Rendered in UTC so all recipients see the same canonical time.
 *
 * Example output: "Wednesday, 10 July 2026 at 09:00 UTC"
 */
function formatUtcDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

/** Returns display name, falling back gracefully to the email address. */
function displayName(name: string | null, email: string | null): string {
  return name ?? email ?? "Unknown";
}

/** Escapes HTML special characters to prevent XSS. */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Validates that a URL is HTTPS, returning a safe fallback otherwise. */
function validateHttpsUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "#";
    return url;
  } catch {
    return "#";
  }
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface MeetingInvitationEmailContent {
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Generates the subject, HTML, and plain-text bodies for a meeting invitation.
 *
 * @param payload - The fully self-contained meeting email payload.
 * @returns An object containing `subject`, `html`, and `text`.
 */
export function generateMeetingInvitationEmail(
  payload: MeetingEmailPayload
): MeetingInvitationEmailContent {
  const {
    title,
    description,
    startTimeUtc,
    endTimeUtc,
    meetingUrl,
    host,
    attendees,
    ticketContext,
  } = payload;

  const startFormatted = formatUtcDateTime(startTimeUtc);
  const endFormatted = formatUtcDateTime(endTimeUtc);
  const hostDisplay = displayName(host.name, host.email);

  // --- Subject ---
  const subject = ticketContext
    ? `Meeting Invitation: ${title} [Ticket #${ticketContext.ticketId}]`
    : `Meeting Invitation: ${title}`;

  // --- Plain-text body ---
  const attendeeList =
    attendees.length > 0
      ? attendees
          .map((a) => `  - ${displayName(a.name, a.email)} <${a.email ?? ""}>`)
          .join("\n")
      : "  (No additional attendees)";

  const ticketLine = ticketContext
    ? `\nLinked Ticket: ${ticketContext.ticketTitle} (#${ticketContext.ticketId})\n`
    : "";

  const descriptionLine = description
    ? `\nAgenda / Description:\n${description}\n`
    : "";

  const text = [
    `You have been invited to a meeting on TicketFlow.`,
    ``,
    `Title:  ${title}`,
    `Start:  ${startFormatted}`,
    `End:    ${endFormatted}`,
    `Host:   ${hostDisplay}`,
    ticketLine.trim(),
    descriptionLine.trim(),
    `Join the meeting: ${meetingUrl}`,
    ``,
    `Attendees:`,
    attendeeList,
    ``,
    `A calendar invitation (.ics) is attached to this email.`,
    ``,
    `— TicketFlow`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const safeTitle = escapeHtml(title);
  const safeSubject = escapeHtml(subject);
  const safeDescription = description ? escapeHtml(description) : "";
  const safeTicketTitle = ticketContext ? escapeHtml(ticketContext.ticketTitle) : "";
  const safeTicketId = ticketContext ? escapeHtml(ticketContext.ticketId) : "";
  const safeMeetingUrl = escapeHtml(validateHttpsUrl(meetingUrl));
  const safeHostDisplay = escapeHtml(hostDisplay);

  // --- HTML body ---
  const ticketBadge = ticketContext
    ? `
        <div style="margin-bottom:20px;">
          <span style="
            display:inline-block;
            background:${TOKEN.surface};
            border:1px solid ${TOKEN.border};
            border-radius:4px;
            padding:4px 10px;
            font-size:12px;
            color:${TOKEN.textSecondary};
            font-family:${TOKEN.font};
          ">
            🎫 Linked to Ticket: <strong>${safeTicketTitle}</strong>
            &nbsp;·&nbsp;#${safeTicketId}
          </span>
        </div>`
    : "";

  const descriptionBlock = description
    ? `
        <div style="
          margin:20px 0;
          padding:14px 16px;
          background:${TOKEN.surface};
          border-left:3px solid ${TOKEN.brand};
          border-radius:4px;
          font-family:${TOKEN.font};
          font-size:14px;
          color:${TOKEN.textPrimary};
          line-height:1.6;
          white-space:pre-line;
        ">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${TOKEN.textSecondary};">Agenda</p>
          ${safeDescription}
        </div>`
    : "";

  const attendeeRows =
    attendees.length > 0
      ? attendees
          .map(
            (a) =>
              `<li style="margin:4px 0;font-size:14px;color:${TOKEN.textPrimary};font-family:${TOKEN.font};">
                ${escapeHtml(displayName(a.name, a.email))}
                ${a.email ? `<span style="color:${TOKEN.textSecondary};">&lt;${escapeHtml(a.email)}&gt;</span>` : ""}
              </li>`
          )
          .join("")
      : `<li style="margin:4px 0;font-size:14px;color:${TOKEN.textSecondary};font-family:${TOKEN.font};">No additional attendees</li>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" style="
          background:${TOKEN.white};
          border-radius:12px;
          overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(99,102,241,.06);
          max-width:560px;
          width:100%;
        ">
          <!-- Header stripe -->
          <tr>
            <td style="
              background:linear-gradient(135deg,${TOKEN.brand} 0%,${TOKEN.brandDark} 100%);
              padding:28px 36px;
            ">
              <p style="margin:0;font-family:${TOKEN.font};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75);">TicketFlow</p>
              <h1 style="margin:8px 0 0;font-family:${TOKEN.font};font-size:22px;font-weight:700;color:${TOKEN.white};line-height:1.3;">
                📅 You're Invited to a Meeting
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">

              ${ticketBadge}

              <!-- Meeting title -->
              <h2 style="margin:0 0 20px;font-family:${TOKEN.font};font-size:20px;font-weight:700;color:${TOKEN.textPrimary};">
                ${safeTitle}
              </h2>

              <!-- Date / time card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="
                background:${TOKEN.surface};
                border:1px solid ${TOKEN.border};
                border-radius:8px;
                margin-bottom:20px;
              ">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:10px;">
                          <p style="margin:0;font-family:${TOKEN.font};font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${TOKEN.textSecondary};">Start</p>
                          <p style="margin:4px 0 0;font-family:${TOKEN.font};font-size:14px;font-weight:600;color:${TOKEN.textPrimary};">${escapeHtml(startFormatted)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:10px;border-top:1px solid ${TOKEN.border};">
                          <p style="margin:0;font-family:${TOKEN.font};font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${TOKEN.textSecondary};">End</p>
                          <p style="margin:4px 0 0;font-family:${TOKEN.font};font-size:14px;font-weight:600;color:${TOKEN.textPrimary};">${escapeHtml(endFormatted)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Host -->
              <p style="margin:0 0 8px;font-family:${TOKEN.font};font-size:13px;color:${TOKEN.textSecondary};">
                <strong style="color:${TOKEN.textPrimary};">Hosted by:</strong> ${safeHostDisplay}
              </p>

              ${descriptionBlock}

              <!-- Attendees -->
              <div style="margin:20px 0;">
                <p style="margin:0 0 8px;font-family:${TOKEN.font};font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${TOKEN.textSecondary};">Attendees</p>
                <ul style="margin:0;padding-left:18px;">
                  ${attendeeRows}
                </ul>
              </div>

              <!-- CTA -->
              <div style="margin:28px 0 0;text-align:center;">
                <a href="${safeMeetingUrl}" style="
                  display:inline-block;
                  background:${TOKEN.brand};
                  color:${TOKEN.white};
                  font-family:${TOKEN.font};
                  font-size:15px;
                  font-weight:700;
                  text-decoration:none;
                  padding:14px 32px;
                  border-radius:8px;
                  letter-spacing:.01em;
                ">
                  Join Google Meet →
                </a>
                <p style="margin:12px 0 0;font-family:${TOKEN.font};font-size:12px;color:${TOKEN.textSecondary};">
                  Or copy the link: <a href="${safeMeetingUrl}" style="color:${TOKEN.brand};">${safeMeetingUrl}</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:20px 36px;
              border-top:1px solid ${TOKEN.border};
              background:#fafafa;
            ">
              <p style="margin:0;font-family:${TOKEN.font};font-size:12px;color:${TOKEN.textSecondary};text-align:center;">
                A calendar invitation (.ics) is attached to this email.
                Import it into Google Calendar, Outlook, or Apple Calendar.
              </p>
              <p style="margin:12px 0 0;font-family:${TOKEN.font};font-size:12px;color:${TOKEN.textSecondary};text-align:center;">
                — TicketFlow
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Generates the subject, HTML, and plain-text bodies for a meeting cancellation.
 */
export function generateMeetingCancelledEmail(
  payload: MeetingEmailPayload
): MeetingInvitationEmailContent {
  const { title, startTimeUtc, endTimeUtc, host, ticketContext } = payload;
  const startFormatted = formatUtcDateTime(startTimeUtc);
  const endFormatted = formatUtcDateTime(endTimeUtc);
  const hostDisplay = displayName(host.name, host.email);

  const subject = ticketContext
    ? `Cancelled: ${title} [Ticket #${ticketContext.ticketId}]`
    : `Cancelled: ${title}`;

  const text = [
    `The following meeting has been cancelled by the host.`,
    ``,
    `Title:  ${title}`,
    `Start:  ${startFormatted}`,
    `End:    ${endFormatted}`,
    `Host:   ${hostDisplay}`,
    ticketContext ? `Linked Ticket: ${ticketContext.ticketTitle} (#${ticketContext.ticketId})` : "",
    ``,
    `A cancellation update (.ics) is attached to remove it from your calendar.`,
    ``,
    `— TicketFlow`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const safeTitle = escapeHtml(title);
  const safeSubject = escapeHtml(subject);
  const safeHostDisplay = escapeHtml(hostDisplay);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:${TOKEN.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:#ef4444;padding:28px 36px;">
              <p style="margin:0;font-family:${TOKEN.font};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75);">TicketFlow</p>
              <h1 style="margin:8px 0 0;font-family:${TOKEN.font};font-size:22px;font-weight:700;color:${TOKEN.white};line-height:1.3;">
                🚫 Meeting Cancelled
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 20px;font-family:${TOKEN.font};font-size:20px;font-weight:700;color:${TOKEN.textPrimary};">${safeTitle}</h2>
              <p style="margin:0 0 20px;font-family:${TOKEN.font};font-size:15px;color:${TOKEN.textPrimary};">
                This meeting has been cancelled by the host (<strong>${safeHostDisplay}</strong>).
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${TOKEN.surface};border:1px solid ${TOKEN.border};border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-family:${TOKEN.font};font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${TOKEN.textSecondary};">Originally Scheduled For</p>
                    <p style="margin:0;font-family:${TOKEN.font};font-size:14px;color:${TOKEN.textPrimary};">${escapeHtml(startFormatted)} - ${escapeHtml(endFormatted)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Generates the subject, HTML, and plain-text bodies for an attendee decline notification.
 */
export function generateAttendeeDeclinedEmail(
  payload: MeetingEmailPayload,
  declinedAttendee: { name: string | null; email: string | null }
): MeetingInvitationEmailContent {
  const { title, ticketContext } = payload;
  const attendeeDisplay = displayName(declinedAttendee.name, declinedAttendee.email);

  const subject = ticketContext
    ? `Declined: ${attendeeDisplay} cannot attend ${title} [Ticket #${ticketContext.ticketId}]`
    : `Declined: ${attendeeDisplay} cannot attend ${title}`;

  const text = [
    `${attendeeDisplay} has declined your meeting invitation.`,
    ``,
    `Meeting: ${title}`,
    ticketContext ? `Linked Ticket: ${ticketContext.ticketTitle} (#${ticketContext.ticketId})` : "",
    ``,
    `— TicketFlow`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const safeTitle = escapeHtml(title);
  const safeSubject = escapeHtml(subject);
  const safeAttendeeDisplay = escapeHtml(attendeeDisplay);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:${TOKEN.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:${TOKEN.surface};padding:28px 36px;border-bottom:1px solid ${TOKEN.border};">
              <h1 style="margin:0;font-family:${TOKEN.font};font-size:18px;font-weight:600;color:${TOKEN.textPrimary};">
                RSVP Update
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px;font-family:${TOKEN.font};font-size:15px;color:${TOKEN.textPrimary};">
                <strong>${safeAttendeeDisplay}</strong> has declined your invitation to:
              </p>
              <div style="padding:16px;background:${TOKEN.surface};border-radius:6px;border-left:3px solid #fbbf24;">
                <p style="margin:0;font-family:${TOKEN.font};font-size:16px;font-weight:600;color:${TOKEN.textPrimary};">${safeTitle}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Generates the subject, HTML, and plain-text bodies for a meeting reminder.
 */
export function generateMeetingReminderEmail(
  payload: MeetingEmailPayload
): MeetingInvitationEmailContent {
  const { title, startTimeUtc, meetingUrl, ticketContext } = payload;
  const startFormatted = formatUtcDateTime(startTimeUtc);

  const subject = ticketContext
    ? `Reminder: ${title} starts in 15 minutes [Ticket #${ticketContext.ticketId}]`
    : `Reminder: ${title} starts in 15 minutes`;

  const text = [
    `Your meeting starts in 15 minutes.`,
    ``,
    `Title:  ${title}`,
    `Time:   ${startFormatted}`,
    ticketContext ? `Linked Ticket: ${ticketContext.ticketTitle} (#${ticketContext.ticketId})` : "",
    ``,
    `Join the meeting here: ${meetingUrl}`,
    ``,
    `— TicketFlow`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const safeTitle = escapeHtml(title);
  const safeSubject = escapeHtml(subject);
  const safeMeetingUrl = escapeHtml(validateHttpsUrl(meetingUrl));
  const safeStartFormatted = escapeHtml(startFormatted);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:${TOKEN.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:${TOKEN.brand};padding:28px 36px;">
              <p style="margin:0;font-family:${TOKEN.font};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75);">TicketFlow</p>
              <h1 style="margin:8px 0 0;font-family:${TOKEN.font};font-size:22px;font-weight:700;color:${TOKEN.white};line-height:1.3;">
                ⏰ Meeting Reminder
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 16px;font-family:${TOKEN.font};font-size:20px;font-weight:700;color:${TOKEN.textPrimary};">${safeTitle}</h2>
              <p style="margin:0 0 24px;font-family:${TOKEN.font};font-size:15px;color:${TOKEN.textPrimary};">
                Your meeting will begin in approximately <strong>15 minutes</strong> (${safeStartFormatted}).
              </p>
              <div style="text-align:center;">
                <a href="${safeMeetingUrl}" style="display:inline-block;background:${TOKEN.brand};color:${TOKEN.white};font-family:${TOKEN.font};font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  Join Meeting Now
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
