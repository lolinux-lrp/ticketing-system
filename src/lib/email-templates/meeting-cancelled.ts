import { MeetingCancelledVariables, RenderedEmail } from './types';
import { escapeHtml } from './index';

export function renderMeetingCancelled(vars: MeetingCancelledVariables): RenderedEmail {
  const safeTitle = escapeHtml(vars.ticketTitle);
  const safeStartTime = escapeHtml(vars.startTime);

  const plainText = `🚫 Google Meet Session Cancelled

The scheduled video session for ${vars.startTime} regarding the ticket "${vars.ticketTitle}" ${vars.ticketId ? `(ID: ${vars.ticketId}) ` : ''}has been cancelled by ${vars.cancellerName || 'the host'}. The room has been dissolved.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
    .content { background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; }
    .alert { color: #b91c1c; font-weight: bold; margin-bottom: 15px; }
    .footer { margin-top: 20px; font-size: 0.875rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Meeting Cancelled</h2>
    </div>
    <div class="content">
      <p class="alert">🚫 Google Meet Session Cancelled</p>
      <p>The scheduled video session for <strong>${safeStartTime}</strong> regarding the ticket <strong>"${safeTitle}"</strong> ${vars.ticketId ? `(ID: ${escapeHtml(vars.ticketId)}) ` : ''}has been cancelled by <strong>${vars.cancellerName ? escapeHtml(vars.cancellerName) : 'the host'}</strong>.</p>
      <p>The room has been dissolved and the link is no longer active.</p>
    </div>
    <div class="footer">
      <p>Thank you,<br/>TicketFlow Support</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject: `Meeting Cancelled: ${vars.ticketTitle}`, 
    plainText,
    html
  };
}
