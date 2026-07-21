import { RenderedEmail, ProjectExpirationVariables } from './types';
import { escapeHtml } from './index';

export function renderProjectExpiration(vars: ProjectExpirationVariables, customSubject?: string, customBody?: string): RenderedEmail {
  const subjectTemplate = customSubject || `[Notice] Support SLA Expired for {project.name}`;
  const bodyTemplate = customBody || `Your technical support contract for {project.name} has ended. Please contact account management to renew your SLA.`;

  const subject = subjectTemplate
    .replace(/{project\.name}/g, vars.projectName)
    .replace(/{email\.subject}/g, vars.emailSubject);

  const plainText = bodyTemplate
    .replace(/{project\.name}/g, vars.projectName)
    .replace(/{email\.subject}/g, vars.emailSubject);

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #f0ad4e;">
      <tr>
        <td>
          <h1 style="color: #f0ad4e; font-size: 20px; margin-bottom: 20px;">Support SLA Expired</h1>
          <p style="color: #555555; line-height: 1.5; margin-bottom: 20px;">
            ${escapeHtml(plainText).replace(/\n/g, '<br/>')}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, plainText, html };
}
