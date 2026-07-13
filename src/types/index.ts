import { Status, Priority, Role, Ticket as PrismaTicket, Comment as PrismaComment } from "@prisma/client";

export { Status, Priority, Role };

export interface TicketUser {
  id: string;
  name: string;
  role: Role;
  email?: string;
}

export interface Ticket extends Omit<PrismaTicket, "createdAt" | "updatedAt" | "description" | "workDone" | "searchVector"> {
  description?: string;
  workDone?: string | null;
  searchVector?: unknown;
  createdAt: string;
  updatedAt: string;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
}

export interface GetTicketsParams {
  status?: Status;
  priority?: Priority;
  search?: string;
  createdById?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: Priority;
  createdById: string;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  assignedToId?: string | null;
  workDone?: string;
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
