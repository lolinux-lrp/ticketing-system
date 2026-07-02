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
