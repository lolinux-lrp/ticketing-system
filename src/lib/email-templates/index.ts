import { RenderedEmail, SLABreachAdminVariables, SLAExecEscalationVariables, ProjectExpirationVariables } from './types';
import { renderSLAAdminWarning } from './sla-admin-warning';
import { renderSLAExecEscalation } from './sla-exec-escalation';
import { renderProjectExpiration } from './project-expiration';

// Sanitize CRLF injection from subject lines
function sanitizeEmailHeader(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\r\n\0]/g, '');
}

/** Escapes HTML special characters to prevent XSS. */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Validates that a URL is HTTPS, returning a safe fallback otherwise. */
export function validateHttpsUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Registry of template renderers.
 */
export const EmailTemplates = {
  renderSLAAdminWarning: (vars: SLABreachAdminVariables): RenderedEmail => {
    const rendered = renderSLAAdminWarning(vars);
    return { ...rendered, subject: sanitizeEmailHeader(rendered.subject) };
  },
  renderSLAExecEscalation: (vars: SLAExecEscalationVariables): RenderedEmail => {
    const rendered = renderSLAExecEscalation(vars);
    return { ...rendered, subject: sanitizeEmailHeader(rendered.subject) };
  },
  renderProjectExpiration: (vars: ProjectExpirationVariables, customSubject?: string, customBody?: string): RenderedEmail => {
    const rendered = renderProjectExpiration(vars, customSubject, customBody);
    return { ...rendered, subject: sanitizeEmailHeader(rendered.subject) };
  }
};

/**
 * Safely constructs a multipart/alternative MIME email string.
 */
export interface MimeOptions {
  messageId?: string;
  bcc?: string;
}

export function buildMimeMessage(
  to: string,
  from: string,
  renderedEmail: RenderedEmail,
  opts?: MimeOptions
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  const headers = [
    `To: ${sanitizeEmailHeader(to)}`,
    `From: ${sanitizeEmailHeader(from)}`,
    `Subject: ${sanitizeEmailHeader(renderedEmail.subject)}`,
    `MIME-Version: 1.0`
  ];

  if (opts?.messageId) headers.push(`Message-ID: <${sanitizeEmailHeader(opts.messageId)}>`);
  if (opts?.bcc) headers.push(`Bcc: ${sanitizeEmailHeader(opts.bcc)}`);

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const mimeMessage = [
    ...headers,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    '',
    renderedEmail.plainText,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    '',
    renderedEmail.html,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export * from './types';
