import nodemailer from "nodemailer";
import { google } from "googleapis";

const APP_BASE_URL = process.env.APP_BASE_URL;
if (!APP_BASE_URL) {
  throw new Error("Missing required environment variable: APP_BASE_URL");
}

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL;
if (!DEFAULT_FROM_EMAIL) {
  throw new Error("Missing required environment variable: DEFAULT_FROM_EMAIL");
}

function sanitizeMessageId(id?: string): string | undefined {
  if (!id) return undefined;
  // Strictly sanitize against CRLF/SMTP header injection
  let sanitized = id.replace(/[\r\n]/g, '').trim();
  if (!sanitized) return undefined;
  if (!sanitized.startsWith('<')) sanitized = `<${sanitized}`;
  if (!sanitized.endsWith('>')) sanitized = `${sanitized}>`;
  return sanitized;
}

export function sanitizeThreadSubject(title: string): string {
  const cleanTitle = title.replace(/^(?:\s*re:\s*)+/gi, '').trim();
  return `Re: ${cleanTitle}`;
}

export function constructThreadHeaders(refsArray: string[]): string | undefined {
  const uniqueRefs = Array.from(new Set(refsArray.filter(Boolean)));
  let finalRefs = uniqueRefs;
  if (uniqueRefs.length > 10) {
    finalRefs = [...uniqueRefs.slice(0, 5), ...uniqueRefs.slice(-5)];
  }
  return finalRefs.length > 0 ? finalRefs.join(" ") : undefined;
}

export function formatEmailHtml(content: string): string {
  // Enforce a strict wrapper div to prevent global style overrides or display:none injections
  return `<div style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.5; padding: 0; margin: 0; display: block !important;">${content}</div>`;
}

/**
 * Strips CRLF characters and surrounding whitespace from a single email
 * address string. Guards against SMTP header injection per OWASP guidelines.
 */
function sanitizeEmailAddress(address: string): string {
  return address.replace(/[\r\n]/g, '').trim();
}

/**
 * Lightweight Markdown-to-HTML email compiler.
 * Safely encodes HTML to prevent XSS, converts basic markdown to inline-styled HTML.
 */
function parseMarkdownToHtml(markdown: string): string {
  // 1. Escaping basic HTML to prevent XSS (OWASP requirement)
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Bold text (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 700; color: inherit;">$1</strong>');

  // 3. Links ([Label](url))
  // We sanitize the URL slightly to avoid `javascript:` links if any bypass earlier steps
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const safeUrl = url.replace(/"/g, '%22');
    const lowerUrl = safeUrl.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://') && !lowerUrl.startsWith('mailto:')) {
      return `[${label}](${safeUrl})`;
    }
    return `<a href="${safeUrl}" style="color: #3b82f6; text-decoration: underline; font-weight: 500;">${label}</a>`;
  });

  // 4. Lists (* item or - item). We'll handle this by splitting lines.
  const lines = html.split('\n');
  let inList = false;
  const parsedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = /^[*-]\s+(.*)$/.exec(line);

    if (isListItem) {
      if (!inList) {
        parsedLines.push('<ul style="margin: 12px 0; padding-left: 24px;">');
        inList = true;
      }
      parsedLines.push(`<li style="margin-bottom: 4px;">${isListItem[1]}</li>`);
    } else {
      if (inList) {
        parsedLines.push('</ul>');
        inList = false;
      }
      parsedLines.push(line);
    }
  }
  if (inList) {
    parsedLines.push('</ul>');
  }

  // 5. Paragraphs and line breaks
  html = parsedLines.join('\n');
  const blocks = html.split(/\n\s*\n/);
  
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith('<ul')) return block; // Lists handle their own margins
    return `<p style="margin: 12px 0; line-height: 1.5;">${block.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return html;
}

// ---------------------------------------------------------------------------
// Centralized ticket recipient builder
// ---------------------------------------------------------------------------

/**
 * Shape returned by `buildTicketRecipients`.
 * `to`  — The sole primary recipient: always the client's email address.
 * `cc`  — Deduplicated array of secondary stakeholders (agent, ticket CC list,
 *          any extra addresses passed by the caller). The client's address and
 *          the system outbound address are always excluded from this list to
 *          prevent duplicate delivery and routing loops.
 */
export interface TicketRecipients {
  to: string;
  cc: string[];
}

/**
 * Enforces the strict industry-standard recipient hierarchy for every outbound
 * ticket email:
 *
 *   To  → Client only   (`contactEmail` or `createdBy.email`)
 *   Cc  → Deduped set of: assigned agent + ticket.ccEmails + additionalCc
 *
 * OWASP CRLF injection protection: every address is passed through
 * `sanitizeEmailAddress` before being included in any header value.
 *
 * @param clientEmail    - Primary client address (`ticket.contactEmail ?? ticket.createdBy?.email`).
 * @param assignedEmail  - Optional assigned agent email (`ticket.assignedTo?.email`).
 * @param ticketCcEmails - CC list stored on the ticket (`ticket.ccEmails`).
 * @param additionalCc   - Extra addresses from the caller (teammates, meeting staff, etc.).
 * @returns `TicketRecipients` with a guaranteed `to` and a clean `cc` array.
 * @throws If no client email can be resolved.
 */
export function buildTicketRecipients(
  clientEmail: string,
  assignedEmail?: string | null,
  ticketCcEmails: string[] = [],
  additionalCc: string[] = []
): TicketRecipients {
  const systemEmail = sanitizeEmailAddress(
    (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL || '').toLowerCase()
  );

  const to = sanitizeEmailAddress(clientEmail);
  if (!to) {
    throw new Error('[buildTicketRecipients] Cannot resolve a client email address for the To field.');
  }

  const toLower = to.toLowerCase();

  // Gather all candidate CC addresses
  const candidates: string[] = [
    ...(assignedEmail ? [assignedEmail] : []),
    ...ticketCcEmails,
    ...additionalCc,
  ];

  const cc = Array.from(
    new Set(
      candidates
        .map(sanitizeEmailAddress)
        .map((e) => e.toLowerCase())
        .filter((e) => {
          // Exclude: empty, the client (prevents duplicate delivery), the
          // system outbound address (prevents routing loops).
          if (!e) return false;
          if (e === toLower) return false;
          if (e === systemEmail) return false;
          return true;
        })
    )
  );

  return { to, cc };
}

interface EmailConfig {
  brandColor: string;
  backgroundColor: string;
}

const EMAIL_CONFIG: EmailConfig = {
  brandColor: "#6366f1",
  backgroundColor: "#f8f8f8",
};

interface NodemailerMail {
  data: nodemailer.SendMailOptions & { threadId?: string };
  message: {
    build(callback: (err: Error | null, messageData: Buffer) => void): void;
    getEnvelope(): Record<string, unknown>;
    getHeader(name: string): string | string[] | undefined;
  };
}

function createTransport() {
  if (process.env.GOOGLE_EMAIL && (process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN)) {
    return nodemailer.createTransport({
      name: 'GmailAPI',
      version: '1.0.0',
      send: (mail: unknown, callback: (err: Error | null, info?: unknown) => void) => {
        const customMail = mail as NodemailerMail;
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        customMail.message.build((err: Error | null, messageData: Buffer) => {
          if (err) return callback(err, null);
          const encodedMessage = messageData
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
          gmail.users.messages.send({
            userId: 'me',
            requestBody: { 
              raw: encodedMessage,
              threadId: customMail.data.threadId || undefined 
            }
          }).then(res => {
            callback(null, {
              envelope: customMail.message.getEnvelope(),
              messageId: (customMail.message.getHeader('message-id') as string) || res.data.id,
              threadId: res.data.threadId
            });
          }).catch(sendErr => {
            callback(sendErr instanceof Error ? sendErr : new Error(String(sendErr)));
          });
        });
      }
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

/**
 * Options for the new-ticket confirmation + agent notification email.
 *
 * `clientEmail`   — Primary client address; always lands in `To`.
 * `assignedEmail` — Optional agent/admin address; routed to `Cc`.
 * `ticketCcEmails`— CC list stored on the ticket; all routed to `Cc`.
 */
interface NewTicketNotificationOptions {
  clientEmail: string;
  assignedEmail?: string | null;
  ticketCcEmails?: string[];
  ticketTitle: string;
  projectName: string;
  ticketId: string;
  messageId?: string;
  threadId?: string;
}

export async function sendNewTicketNotification({
  clientEmail,
  assignedEmail,
  ticketCcEmails = [],
  ticketTitle,
  projectName,
  ticketId,
  messageId,
  threadId,
}: NewTicketNotificationOptions): Promise<{ messageId?: string; threadId?: string }> {
  const transport = createTransport();
  const ticketUrl = `${APP_BASE_URL}/tickets/${ticketId}`;
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string,
  };

  // Enforce To: Client / Cc: Agent + other stakeholders
  const { to, cc } = buildTicketRecipients(clientEmail, assignedEmail, ticketCcEmails);

  const info = await transport.sendMail({
    to,
    cc: cc.length > 0 ? cc.join(", ") : undefined,
    from,
    subject: sanitizeThreadSubject(ticketTitle),
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
    inReplyTo: sanitizeMessageId(messageId),
    references: sanitizeMessageId(messageId),
    threadId,
  } as nodemailer.SendMailOptions & { threadId?: string });

  return {
    messageId: info.messageId,
    threadId: (info as nodemailer.SentMessageInfo & { threadId?: string }).threadId || threadId,
  };
}

// ---------------------------------------------------------------------------
// Ticket reply email
// ---------------------------------------------------------------------------

export interface TicketReplyEmailOptions {
  ticket: {
    id: string;
    title: string;
    contactEmail: string | null;
    messageId: string | null;
    threadId: string | null;
    ccEmails: string[];
    assignedTo?: { email: string | null } | null;
    createdBy?: { email: string | null } | null;
    messages: { messageId: string | null }[];
  };
  messageContent: string;
  senderName: string;
  htmlQuoteBlock?: string;
  additionalCc?: string[];
  htmlOverride?: string;
  subjectOverride?: string;
}

export async function sendTicketReplyEmail({
  ticket,
  messageContent,
  senderName,
  htmlQuoteBlock = "",
  additionalCc = [],
  htmlOverride,
  subjectOverride
}: TicketReplyEmailOptions): Promise<{ messageId?: string; threadId?: string }> {
  const transport = createTransport();
  const from = {
    name: "TicketFlow",
    address: (process.env.GOOGLE_EMAIL || DEFAULT_FROM_EMAIL) as string,
  };

  const clientEmail = ticket.contactEmail || ticket.createdBy?.email || "";
  if (!clientEmail) {
    throw new Error("Cannot send reply: ticket has no client email.");
  }

  // Enforce To: Client / Cc: Agent + Stakeholders
  const { to, cc } = buildTicketRecipients(
    clientEmail, 
    ticket.assignedTo?.email, 
    ticket.ccEmails, 
    additionalCc
  );

  const subject = subjectOverride || sanitizeThreadSubject(ticket.title);

  // 1. Threading: Use the last message if available, otherwise strictly fallback to the root ticket.messageId
  const lastMessage = ticket.messages[0];
  const rawInReplyTo = lastMessage?.messageId || ticket.messageId;
  const inReplyTo = sanitizeMessageId(rawInReplyTo || undefined);

  // 2. Threading: Build references chain starting with the root messageId
  const previousMessageIds = [...ticket.messages]
    .reverse()
    .map(m => m.messageId)
    .filter((id): id is string => !!id);
    
  const refsArray = [ticket.messageId, ...previousMessageIds]
    .filter((id): id is string => !!id)
    .map(id => sanitizeMessageId(id))
    .filter((id): id is string => !!id);
    
  // Use a Set to remove duplicates while preserving the chain order
  const references = constructThreadHeaders(refsArray);

  const parsedContent = parseMarkdownToHtml(messageContent);
  const htmlAttribution = `<br/><br/>---<br/>Best regards,<br/>${senderName}<br/>Support Team`;
  let htmlBody = htmlOverride || `${parsedContent}${htmlAttribution}${htmlQuoteBlock}`;
  htmlBody = formatEmailHtml(htmlBody);
  
  const textAttribution = `\n\n---\nBest regards,\n${senderName}\nSupport Team`;
  const textBody = htmlOverride ? messageContent : `${messageContent}${textAttribution}`;

  const info = await transport.sendMail({
    to,
    cc: cc.length > 0 ? cc.join(", ") : undefined,
    from,
    subject,
    text: textBody,
    html: htmlBody,
    inReplyTo,
    references,
    threadId: ticket.threadId || undefined,
  } as nodemailer.SendMailOptions & { threadId?: string });

  return {
    messageId: info.messageId,
    threadId: (info as nodemailer.SentMessageInfo & { threadId?: string }).threadId || ticket.threadId || undefined,
  };
}


