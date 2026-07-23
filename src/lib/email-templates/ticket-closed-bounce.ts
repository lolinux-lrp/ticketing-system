import { TicketClosedBounceVariables, RenderedEmail } from './types';
import { escapeHtml, validateHttpsUrl } from './index';

export function renderTicketClosedBounce(vars: TicketClosedBounceVariables): RenderedEmail {
  const safeName = escapeHtml(vars.senderName);
  const safeTitle = escapeHtml(vars.ticketTitle);
  const safeSupportUrl = validateHttpsUrl(vars.supportUrl) || '#';

  const plainText = `Hi ${vars.senderName},

Your recent reply to the ticket "${vars.ticketTitle}" (ID: ${vars.ticketId}) could not be processed because this ticket has already been marked as CLOSED or RESOLVED.

If you are still experiencing issues, please open a new support request by visiting:
${safeSupportUrl}

Thank you,
Support Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { margin-bottom: 20px; }
    .content { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .alert { color: #b91c1c; font-weight: bold; margin-bottom: 15px; }
    .footer { margin-top: 20px; font-size: 0.875rem; color: #6b7280; }
    .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ticket Closed Notification</h2>
    </div>
    <div class="content">
      <p>Hi ${safeName},</p>
      <p class="alert">Your recent reply could not be processed.</p>
      <p>The support ticket <strong>"${safeTitle}"</strong> (ID: ${vars.ticketId}) you replied to has already been marked as <strong>CLOSED</strong> or <strong>RESOLVED</strong>.</p>
      <p>If you are still experiencing issues or need further assistance, please open a new support request.</p>
      <a href="${safeSupportUrl}" class="button">Open New Ticket</a>
    </div>
    <div class="footer">
      <p>Thank you,<br/>Support Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject: `Re: ${vars.ticketTitle} (Ticket Closed)`,
    plainText,
    html
  };
}
