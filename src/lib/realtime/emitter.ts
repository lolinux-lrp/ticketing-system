import { EventEmitter } from "events";

export type RealtimeAction = "MESSAGE_ADDED" | "MEETING_SCHEDULED" | "MEETING_CANCELLED" | "STATUS_CHANGED";

export type RealtimeEvent =
  | { type: "TICKET_MUTATED"; ticketId: string; action: RealtimeAction }
  | { type: "TICKET_CREATED"; ticketId: string }
  | { type: "TICKET_DELETED"; ticketId: string; snapshotData: { createdById: string; assignedToId?: string | null } };

class RealtimeEmitter extends EventEmitter {}

// Preserve singleton across Next.js HMR in development
const globalForRealtime = globalThis as unknown as {
  realtimeEmitter: RealtimeEmitter | undefined;
};

export const realtimeEmitter = globalForRealtime.realtimeEmitter ?? new RealtimeEmitter();
realtimeEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.realtimeEmitter = realtimeEmitter;
}

export function broadcastTicketMutation(ticketId: string, action: RealtimeAction) {
  if (realtimeEmitter.listenerCount("event") > 0) {
    realtimeEmitter.emit("event", {
      type: "TICKET_MUTATED",
      ticketId,
      action,
    } as RealtimeEvent);
  }
}

export function broadcastTicketCreated(ticketId: string) {
  if (realtimeEmitter.listenerCount("event") > 0) {
    realtimeEmitter.emit("event", {
      type: "TICKET_CREATED",
      ticketId,
    } as RealtimeEvent);
  }
}

export function broadcastTicketDeleted(ticketId: string, snapshotData: { createdById: string; assignedToId?: string | null }) {
  if (realtimeEmitter.listenerCount("event") > 0) {
    realtimeEmitter.emit("event", {
      type: "TICKET_DELETED",
      ticketId,
      snapshotData,
    } as RealtimeEvent);
  }
}
