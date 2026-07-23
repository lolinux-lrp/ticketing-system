import { Status, Priority, Role, Ticket as PrismaTicket, Project as PrismaProject, ProjectDomain, TicketMessage as PrismaTicketMessage, TicketMessageSenderType } from "@prisma/client";

export { Status, Priority, Role, TicketMessageSenderType };

export interface Project extends PrismaProject {
  domains: ProjectDomain[];
}


export interface TicketUser {
  id: string;
  name: string;
  role: Role;
  email?: string;
}

export interface TicketMessage extends Omit<PrismaTicketMessage, "createdAt"> {
  createdAt: string;
}

export interface Ticket extends Omit<PrismaTicket, "createdAt" | "updatedAt" | "lastActivityAt" | "description" | "resolution" | "contactEmail" | "searchVector" | "resolvedAt"> {
  description?: string;
  resolution: string | null;
  searchVector?: unknown;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  resolvedAt: string | null;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  project?: { id: string; name: string } | null;
  contactEmail?: string | null;
  messages?: TicketMessage[];
}

export interface GetTicketsParams {
  status?: Status;
  priority?: Priority;
  search?: string;
  createdById?: string;
  projectId?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: Priority;
  createdById: string;
  projectId?: string;
  contactEmail?: string | null;
}

export interface CreateTicketMessagePayload {
  content: string;
  to?: string;
  cc?: string;
  bcc?: string;
  newStatus?: Status;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  assignedToId?: string | null;
  resolution?: string;
}

export interface DeleteTicketResponse {
  message: string;
  data: Ticket;
}


