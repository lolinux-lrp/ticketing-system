import nodemailer from "nodemailer";

function createTransport() {
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
  hostUrl: string;
  isUpgrade: boolean;
}

export async function sendInviteEmail({ name, email, role, hostUrl, isUpgrade }: InviteEmailOptions) {
  const transport = createTransport();
  const loginUrl = `${hostUrl}/login`;
  const signupUrl = `${hostUrl}/signup`;

  const subject = isUpgrade
    ? `Your role has been updated to ${role} on TicketFlow`
    : `You've been invited to join TicketFlow as ${role === "ADMIN" ? "an Admin" : "an Agent"}`;

  const textBody = isUpgrade
    ? `Hello ${name},\n\nYour role on TicketFlow has been upgraded to ${role}.\nSign in at: ${loginUrl}\n`
    : `Hello ${name},\n\nYou have been invited to TicketFlow as ${role === "ADMIN" ? "an Admin" : "an Agent"}.\n\nIf you already have a Google account, sign in with Google at:\n${loginUrl}\n\nOr create a password-based account at:\n${signupUrl}\n\nWelcome aboard!`;

  const htmlBody = isUpgrade
    ? `<p>Hello <strong>${name}</strong>,</p>
       <p>Your role on TicketFlow has been upgraded to <strong>${role}</strong>.</p>
       <p><a href="${loginUrl}">Sign in to TicketFlow</a></p>`
    : `<p>Hello <strong>${name}</strong>,</p>
       <p>You have been invited to TicketFlow as <strong>${role === "ADMIN" ? "an Admin" : "an Agent"}</strong>.</p>
       <p>You can sign in using:</p>
       <ul>
         <li><a href="${loginUrl}">Sign in with Google</a> (if you have a Google account)</li>
         <li><a href="${signupUrl}">Create a password-based account</a></li>
       </ul>
       <p>Welcome aboard!</p>`;

  const info = await transport.sendMail({
    to: email,
    from: `"TicketFlow" <noreply@ticketing-system.local>`,
    subject,
    text: textBody,
    html: htmlBody,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Invite email preview URL: %s", previewUrl);
  }
}