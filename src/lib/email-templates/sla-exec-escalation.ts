import { RenderedEmail, SLAExecEscalationVariables } from './types';
import { escapeHtml, validateHttpsUrl } from './index';

export function renderSLAExecEscalation(vars: SLAExecEscalationVariables): RenderedEmail {
  const subject = `[URGENT ESCALATION] Ticket ${vars.priority} unresolved 2+ hours after SLA breach - ${vars.title}`;
  
  const safeTitle = escapeHtml(vars.title);
  const safeTicketId = escapeHtml(vars.ticketId);
  const safePriority = escapeHtml(vars.priority);
  const safeHoursOpen = escapeHtml(vars.hoursOpen);
  const safeDashboardUrl = validateHttpsUrl(vars.dashboardUrl);

  const plainText = `
Executive Escalation Alert

Ticket: ${vars.title}
ID: ${vars.ticketId}
Priority: ${vars.priority}
Total Time Open: ${vars.hoursOpen} hours

This ticket has remained open for over 2 hours since the initial SLA breach alert to admins.
${safeDashboardUrl ? `\nView Ticket: ${safeDashboardUrl}` : ''}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #c9302c;">
      <tr>
        <td>
          <h1 style="color: #c9302c; font-size: 20px; margin-bottom: 20px;">Executive Escalation Alert</h1>
          <table cellpadding="10" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; margin-bottom: 20px; border-radius: 4px;">
            <tr>
              <td width="30%" style="color: #555555; font-weight: bold;">Ticket:</td>
              <td style="color: #333333;">${safeTitle}</td>
            </tr>
            <tr>
              <td style="color: #555555; font-weight: bold;">ID:</td>
              <td style="color: #333333;">${safeTicketId}</td>
            </tr>
            <tr>
              <td style="color: #555555; font-weight: bold;">Priority:</td>
              <td style="color: #333333; font-weight: bold;">${safePriority}</td>
            </tr>
            <tr>
              <td style="color: #555555; font-weight: bold;">Total Time Open:</td>
              <td style="color: #c9302c; font-weight: bold;">${safeHoursOpen} hours</td>
            </tr>
          </table>
          <p style="color: #555555; line-height: 1.5; margin-bottom: 20px;">
            This ticket has remained open for over 2 hours since the initial SLA breach alert to admins.
          </p>
          ${safeDashboardUrl ? `
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-radius: 4px; background-color: #c9302c;">
                <a href="${escapeHtml(safeDashboardUrl)}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">Review Escalation</a>
              </td>
            </tr>
          </table>
          ` : ''}
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, plainText, html };
}
