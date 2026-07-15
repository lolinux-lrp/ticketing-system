import { Status, Priority, Role, Ticket as PrismaTicket, Comment as PrismaComment } from "@prisma/client";

export { Status, Priority, Role };

export interface TicketUser {
  id: string;
  name: string;
  role: Role;
  email?: string;
}

export interface Ticket extends Omit<PrismaTicket, "createdAt" | "updatedAt" | "description" | "resolution" | "contactEmail" | "searchVector" | "resolvedAt"> {
  description?: string;
  resolution: string | null;
  searchVector?: unknown;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  project?: { id: string; name: string } | null;
  contactEmail?: string | null;
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
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: Priority;
  createdById: string;
  projectId?: string;
  contactEmail?: string | null;
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

export interface Comment extends Omit<PrismaComment, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
  author: TicketUser;
}

export interface CreateCommentPayload {
  ticketId: string;
  authorId: string;
  content: string;
}

export interface GetCommentsParams {
  ticketId: string;
}
