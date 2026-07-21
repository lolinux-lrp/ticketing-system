export interface RenderedEmail {
  subject: string;
  plainText: string;
  html: string;
}

export interface SLABreachAdminVariables {
  ticketId: string;
  title: string;
  priority: string;
  hoursOpen: string;
  dashboardUrl?: string; // Optional dashboard link if available
}

export interface SLAExecEscalationVariables {
  ticketId: string;
  title: string;
  priority: string;
  hoursOpen: string;
  dashboardUrl?: string;
}

export interface ProjectExpirationVariables {
  projectName: string;
  emailSubject: string;
}
