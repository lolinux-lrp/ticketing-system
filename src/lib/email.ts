import nodemailer from "nodemailer";
import type { MeetingEmailPayload } from "@/types/meeting";
import { 
  generateMeetingInvitationEmail,
  generateMeetingCancelledEmail,
  generateAttendeeDeclinedEmail,
  generateMeetingReminderEmail
} from "@/lib/email/templates/meeting";
import { createMeetingIcsAttachment } from "@/lib/calendar/ics";

const APP_BASE_URL = process.env.APP_BASE_URL;
if (!APP_BASE_URL) {
  throw new Error("Missing required environment variable: APP_BASE_URL");
}

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL;
if (!DEFAULT_FROM_EMAIL) {
  throw new Error("Missing required environment variable: DEFAULT_FROM_EMAIL");
}

interface EmailConfig {
  brandColor: string;
  backgroundColor: string;
}

const EMAIL_CONFIG: EmailConfig = {
  brandColor: "#6366f1",
  backgroundColor: "#f8f8f8",
};

function createTransport() {
  if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GOOGLE_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

interface InviteEmailOptions {
  name: string;
  email: string;
  role: "AGENT" | "ADMIN";
  signupUrl?: string;
  isUpgrade: boolean;
}

export async function sendInviteEmail({ name, email, role, signupUrl, isUpgrade }: InviteEmailOptions) {
  const transport = createTransport();
  const loginUrl = `${APP_BASE_URL}/login`;
  const finalSignupUrl = signupUrl || `${APP_BASE_URL}/signup`;

  const subject = isUpgrade
    ? `Your role has been updated to ${role} on TicketFlow`
    : `You've been invited to join TicketFlow as ${role === "ADMIN" ? "an Admin" : "an Agent"}`;

  const textBody = isUpgrade
    ? `Hello ${name},\n\nYour role on TicketFlow has been upgraded to ${role}.\nSign in at: ${loginUrl}\n`
    : `Hello ${name},\n\nYou have been invited to TicketFlow as ${role === "ADMIN" ? "an Admin" : "an Agent"}.\n\nIf you already have a Google account, sign in with Google at:\n${loginUrl}\n\nOr create a password-based account at:\n${finalSignupUrl}\n\nWelcome aboard!`;

  const htmlBody = isUpgrade
    ? `<p>Hello <strong>${name}</strong>,</p>
       <p>Your role on TicketFlow has been upgraded to <strong>${role}</strong>.</p>
       <p><a href="${loginUrl}">Sign in to TicketFlow</a></p>`
    : `<p>Hello <strong>${name}</strong>,</p>
       <p>You have been invited to TicketFlow as <strong>${role === "ADMIN" ? "an Admin" : "an Agent"}</strong>.</p>
       <p>You can sign in using:</p>
       <ul>
         <li><a href="${loginUrl}">Sign in with Google</a> (if you have a Google account)</li>
         <li><a href="${finalSignupUrl}">Create a password-based account</a></li>
       </ul>
       <p>Welcome aboard!</p>`;

  await transport.sendMail({
    to: email,
    from: {
      name: "TicketFlow",
      address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
    },
    subject,
    text: textBody,
    html: htmlBody,
  });

}

interface TicketAssignmentEmailOptions {
  assigneeName: string;
  assigneeEmail: string;
  ticketTitle: string;
  ticketId: string;
  assignedByName: string;
}

export async function sendTicketAssignmentEmail({
  assigneeName,
  assigneeEmail,
  ticketTitle,
  ticketId,
  assignedByName,
}: TicketAssignmentEmailOptions) {
  const transport = createTransport();
  const ticketUrl = `${APP_BASE_URL}/tickets/${ticketId}`;
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  await transport.sendMail({
    to: assigneeEmail,
    from,
    subject: `You've been assigned a ticket: ${ticketTitle}`,
    text: `Hi ${assigneeName},\n\nA ticket has been assigned to you by ${assignedByName}.\n\nTicket: ${ticketTitle}\nView it here: ${ticketUrl}\n\n— TicketFlow`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: ${EMAIL_CONFIG.brandColor};">New Ticket Assigned</h2>
        <p>Hi <strong>${assigneeName}</strong>,</p>
        <p><strong>${assignedByName}</strong> has assigned a ticket to you:</p>
        <div style="background:${EMAIL_CONFIG.backgroundColor};border-left:4px solid ${EMAIL_CONFIG.brandColor};padding:12px 16px;border-radius:4px;margin:16px 0;">
          <strong>${ticketTitle}</strong>
        </div>
        <a href="${ticketUrl}" style="display:inline-block;background:${EMAIL_CONFIG.brandColor};color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View Ticket</a>
        <p style="margin-top:24px;color:#888;font-size:12px;">— TicketFlow</p>
      </div>
    `,
  });

}

interface NewTicketNotificationOptions {
  to: string;
  ticketTitle: string;
  projectName: string;
  ticketId: string;
}

export async function sendNewTicketNotification({
  to,
  ticketTitle,
  projectName,
  ticketId,
}: NewTicketNotificationOptions) {
  const transport = createTransport();
  const ticketUrl = `${APP_BASE_URL}/tickets/${ticketId}`;
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  await transport.sendMail({
    to,
    from,
    subject: `New Ticket Created: ${ticketTitle}`,
    text: `Your ticket "${ticketTitle}" has been successfully created for project ${projectName}.\n\nView it here: ${ticketUrl}\n\n— TicketFlow`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: ${EMAIL_CONFIG.brandColor};">Ticket Created</h2>
        <p>Your ticket has been successfully created for project <strong>${projectName}</strong>.</p>
        <div style="background:${EMAIL_CONFIG.backgroundColor};border-left:4px solid ${EMAIL_CONFIG.brandColor};padding:12px 16px;border-radius:4px;margin:16px 0;">
          <strong>${ticketTitle}</strong>
        </div>
        <a href="${ticketUrl}" style="display:inline-block;background:${EMAIL_CONFIG.brandColor};color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View Ticket</a>
        <p style="margin-top:24px;color:#888;font-size:12px;">— TicketFlow</p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Meeting invitation email
// ---------------------------------------------------------------------------

/**
 * Sends a meeting invitation email to all attendees (and the host) listed in
 * the payload. Each addressable participant receives an individual message so
 * the "To:" header is correct for every recipient.
 *
 * The email body is generated by `generateMeetingInvitationEmail` and an
 * `.ics` calendar attachment is generated by `createMeetingIcsAttachment`.
 *
 * The `.ics` is attached with content-type `text/calendar; method=REQUEST`
 * so that conforming email clients (Gmail, Outlook, Apple Mail) surface an
 * inline "Accept / Decline" RSVP widget.
 *
 * @throws If `DEFAULT_FROM_EMAIL` is not set or the ICS generator fails.
 */
export async function sendMeetingInvitationEmail(
  payload: MeetingEmailPayload
): Promise<void> {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  // Generate template content (subject, html, text) once — shared for all recipients.
  const { subject, html, text } = generateMeetingInvitationEmail(payload);

  // Generate the .ics attachment once — shared for all recipients.
  const icsContent = createMeetingIcsAttachment(payload);

  const icsAttachment = {
    filename: "invite.ics",
    content: icsContent,
    contentType: "text/calendar; method=REQUEST",
  } as const;

  // Collect all recipients: attendees with a valid email + the host.
  type Recipient = { name: string | null; email: string };
  const recipients: Recipient[] = [
    ...(payload.host.email
      ? [{ name: payload.host.name, email: payload.host.email }]
      : []),
    ...payload.attendees
      .filter((a): a is typeof a & { email: string } => a.email !== null)
      .map((a) => ({ name: a.name, email: a.email })),
  ];

  if (recipients.length === 0) {
    console.warn(
      "[sendMeetingInvitationEmail] No addressable recipients found — no emails sent."
    );
    return;
  }

  // Dispatch one email per recipient.
  await Promise.allSettled(
    recipients.map(async (recipient) => {
      await transport.sendMail({
        from,
        to: recipient.name
          ? { name: recipient.name, address: recipient.email }
          : recipient.email,
        subject,
        text,
        html,
        attachments: [icsAttachment],
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Meeting cancellation email
// ---------------------------------------------------------------------------

export async function sendMeetingCancelledEmail(
  payload: MeetingEmailPayload
): Promise<void> {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };
  
  // Set method and status explicitly for the cancellation payload
  const cancelPayload: MeetingEmailPayload = {
    ...payload,
    method: "CANCEL",
    status: "CANCELLED",
  };

  const { subject, html, text } = generateMeetingCancelledEmail(cancelPayload);
  const icsContent = createMeetingIcsAttachment(cancelPayload);

  const icsAttachment = {
    filename: "cancel.ics",
    content: icsContent,
    contentType: "text/calendar; method=CANCEL",
  } as const;

  type Recipient = { name: string | null; email: string };
  const recipients: Recipient[] = [
    ...(cancelPayload.host.email
      ? [{ name: cancelPayload.host.name, email: cancelPayload.host.email }]
      : []),
    ...cancelPayload.attendees
      .filter((a): a is typeof a & { email: string } => a.email !== null)
      .map((a) => ({ name: a.name, email: a.email })),
  ];

  if (recipients.length === 0) return;

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      await transport.sendMail({
        from,
        to: recipient.name
          ? { name: recipient.name, address: recipient.email }
          : recipient.email,
        subject,
        text,
        html,
        attachments: [icsAttachment],
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Attendee declined email
// ---------------------------------------------------------------------------

export async function sendAttendeeDeclinedEmail(
  payload: MeetingEmailPayload,
  declinedAttendee: { name: string | null; email: string | null }
): Promise<void> {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  const { subject, html, text } = generateAttendeeDeclinedEmail(
    payload,
    declinedAttendee
  );

  const hostEmail = payload.host.email;
  if (!hostEmail) return; // Cannot notify host if no email

  await transport.sendMail({
    from,
    to: payload.host.name
      ? { name: payload.host.name, address: hostEmail }
      : hostEmail,
    subject,
    text,
    html,
  });
}

// ---------------------------------------------------------------------------
// Meeting reminder email
// ---------------------------------------------------------------------------

export async function sendMeetingReminderEmail(
  payload: MeetingEmailPayload
): Promise<void> {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  const { subject, html, text } = generateMeetingReminderEmail(payload);

  type Recipient = { name: string | null; email: string };
  const recipients: Recipient[] = [
    ...(payload.host.email
      ? [{ name: payload.host.name, email: payload.host.email }]
      : []),
    ...payload.attendees
      .filter((a): a is typeof a & { email: string } => a.email !== null)
      .map((a) => ({ name: a.name, email: a.email })),
  ];

  if (recipients.length === 0) return;

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      await transport.sendMail({
        from,
        to: recipient.name
          ? { name: recipient.name, address: recipient.email }
          : recipient.email,
        subject,
        text,
        html,
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Contract expiration email
// ---------------------------------------------------------------------------

interface ExpirationEmailOptions {
  to: string;
  projectName: string;
  originalSubject: string;
  customSubject?: string | null;
  customBody?: string | null;
}

export async function sendExpirationEmail({
  to,
  projectName,
  originalSubject,
  customSubject,
  customBody,
}: ExpirationEmailOptions) {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string
  };

  const subjectTemplate = customSubject || `[Notice] Support SLA Expired for {project.name}`;
  const bodyTemplate = customBody || `Your technical support contract for {project.name} has ended. Please contact account management to renew your SLA.`;

  const subject = subjectTemplate
    .replace(/{project\.name}/g, projectName)
    .replace(/{email\.subject}/g, originalSubject);

  const text = bodyTemplate
    .replace(/{project\.name}/g, projectName)
    .replace(/{email\.subject}/g, originalSubject);

  await transport.sendMail({
    to,
    from,
    subject,
    text,
  });
}