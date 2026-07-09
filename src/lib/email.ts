import nodemailer from "nodemailer";

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

  const info = await transport.sendMail({
    to: email,
    from: process.env.GOOGLE_EMAIL ? `"TicketFlow" <${process.env.GOOGLE_EMAIL}>` : `"TicketFlow" <${DEFAULT_FROM_EMAIL}>`,
    subject,
    text: textBody,
    html: htmlBody,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Invite email preview URL: %s", previewUrl);
  }
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
  const from = process.env.GOOGLE_EMAIL
    ? `"TicketFlow" <${process.env.GOOGLE_EMAIL}>`
    : `"TicketFlow" <${DEFAULT_FROM_EMAIL}>`;

  const info = await transport.sendMail({
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

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Assignment email preview URL: %s", previewUrl);
  }
}