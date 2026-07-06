export type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Role = "CUSTOMER" | "AGENT" | "ADMIN";

export interface TicketUser {
  id: string;
  name: string;
  role: Role;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  createdById: string;
  assignedToId: string | null;
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
}

export interface DeleteTicketResponse {
  message: string;
  data: Ticket;
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author?: {
    name: string;
    role: string;
  }
}

export interface CreateCommentPayload {
  ticketId: string;
  authorId: string;
  content: string;
}

export interface GetCommentsParams {
  ticketId: string;
}
