import { Role } from "@/types";

export type Action =
  // User Management
  | "user:invite"
  | "user:list_agents"
  // Ticket Actions
  | "ticket:create"
  | "ticket:view"
  | "ticket:update_content"
  | "ticket:update_workflow"
  | "ticket:assign"
  | "ticket:delete"
  // Comment Actions
  | "comment:create"
  | "comment:delete";

export interface TicketResource {
  createdById: string;
  assignedToId?: string | null;
}

export interface CommentResource {
  authorId: string;
}

type SessionUser = {
  id: string;
  role: Role | string;
};

export function can(user: SessionUser, action: Action, resource?: TicketResource | CommentResource | null): boolean {
  const role = user.role;

  switch (action) {
    case "user:invite":
      return role === "ADMIN";

    case "user:list_agents":
      return role === "ADMIN" || role === "AGENT";

    case "ticket:create":
      return true; // Any authenticated user can create a ticket

    case "ticket:view":
      if (role === "ADMIN" || role === "AGENT") return true;
      if (role === "CUSTOMER") {
        return !!resource && "createdById" in resource && resource.createdById === user.id;
      }
      return false;

    case "ticket:update_content":
      // Only the ticket creator can update the content (title/description)
      // Even Admins/Agents cannot edit someone else's title/description
      return !!resource && "createdById" in resource && resource.createdById === user.id;

    case "ticket:update_workflow":
      // Workflow updates (status, priority, resolution) are reserved for Agents and Admins
      return role === "ADMIN" || role === "AGENT";

    case "ticket:assign":
      if (role === "ADMIN") return true;
      if (role === "AGENT") {
        return !!resource && "assignedToId" in resource && (resource.assignedToId === user.id || resource.assignedToId === null);
      }
      return false;

    case "ticket:delete":
      return role === "ADMIN";

    case "comment:create":
      if (role === "ADMIN" || role === "AGENT") return true;
      if (role === "CUSTOMER") {
        return !!resource && "createdById" in resource && resource.createdById === user.id;
      }
      return false;

    case "comment:delete":
      if (role === "ADMIN") return true;
      return !!resource && "authorId" in resource && resource.authorId === user.id;

    default:
      return false;
  }
}
