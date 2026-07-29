import { MeetingScheduledVariables, RenderedEmail } from './types';
import { escapeHtml, validateHttpsUrl } from './index';

export function renderMeetingScheduled(vars: MeetingScheduledVariables): RenderedEmail {
  const safeTitle = escapeHtml(vars.ticketTitle);
  const safeHost = escapeHtml(vars.hostName || "Support Team");
  const safeStartTime = escapeHtml(vars.startTime);
  const safeDuration = escapeHtml(vars.duration.toString());
  const safeUrl = validateHttpsUrl(vars.meetUrl) || '#';

  const plainText = `Hi ${vars.hostName || "Support Team"},

A Google Meet session has been scheduled for your ticket "${vars.ticketTitle}".

Details:
- Time: ${vars.startTime}
- Duration: ${vars.duration} minutes
- Link: ${vars.meetUrl}

*Note: You do not need special permissions to enter the room or share your screen.*`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
    .content { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .alert { color: #2563eb; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; }
    .footer { margin-top: 20px; font-size: 0.875rem; color: #6b7280; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; margin: 20px 0; }
    .details { margin: 15px 0; padding-left: 15px; border-left: 4px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Meeting Scheduled</h2>
    </div>
    <div class="content">
      <p>A live video conference room has been provisioned for the ticket <strong>"${safeTitle}"</strong>.</p>
      
      <div class="details">
        <p><strong>Host:</strong> ${safeHost}</p>
        <p><strong>Start Time:</strong> ${safeStartTime}</p>
        <p><strong>Duration:</strong> ${safeDuration} minutes</p>
      </div>

      <a href="${safeUrl}" class="button" style="color: #ffffff;">Join Google Meet Room</a>
      
      <p style="font-size: 0.875rem; color: #6b7280;"><em>Note: You do not need special permissions to enter the room or share your screen.</em></p>
    </div>
    <div class="footer">
      <p>Thank you,<br/>TicketFlow Support</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject: `Meeting Scheduled: ${vars.ticketTitle}`, // Will be properly prefixed or cloned by sendTicketReplyEmail
    plainText,
    html
  };
}
