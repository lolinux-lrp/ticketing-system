/**
 * ============================================================================
 * TICKETFLOW EMAIL TEMPLATE ENGINE: DEVELOPER GUIDELINES
 * ============================================================================
 * 
 * WHAT IS ALLOWED:
 * 1. Using strictly typed variable interpolation (e.g., `${vars.title}`).
 * 2. Using basic, universally supported HTML elements (<h1>, <p>, <table>, <tr>, <td>).
 * 3. Using inline CSS styling only (e.g., `style="color: #d9534f; font-weight: bold;"`).
 * 4. Providing both a clean plain-text fallback and an HTML version for every email.
 * 
 * WHAT IS STRICTLY FORBIDDEN:
 * 1. Adding arbitrary/untyped variables without first updating the TypeScript interface in types.ts.
 * 2. Using <style> tags, external CSS stylesheets (<link>), or modern web fonts/flexbox/grid (email clients will strip or break them).
 * 3. Putting raw, unsanitized line breaks (\r or \n) into Subject lines.
 * 
 * ============================================================================
 */

/*
import { RenderedEmail } from './types';

// Example Template Interface (define in types.ts)
// export interface ExampleVariables {
//   userName: string;
//   actionUrl: string;
// }

export function renderExampleTemplate(vars: ExampleVariables): RenderedEmail {
  const subject = `Action Required for ${vars.userName}`;
  
  const plainText = `
Hello ${vars.userName},

Please review the latest updates on your account.
Visit this link to take action: ${vars.actionUrl}

Thank you,
TicketFlow Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <tr>
        <td>
          <h1 style="color: #333333; font-size: 20px; margin-bottom: 20px;">Action Required</h1>
          <p style="color: #555555; line-height: 1.5; margin-bottom: 20px;">
            Hello <strong>${vars.userName}</strong>,
          </p>
          <p style="color: #555555; line-height: 1.5; margin-bottom: 20px;">
            Please review the latest updates on your account.
          </p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-radius: 4px; background-color: #007bff;">
                <a href="${vars.actionUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">Review Now</a>
              </td>
            </tr>
          </table>
          <p style="color: #999999; font-size: 12px; margin-top: 30px;">
            Thank you,<br/>TicketFlow Team
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, plainText, html };
}
*/
