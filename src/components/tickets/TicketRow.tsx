"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Priority, Status, Ticket } from "@/types";
import {
  useDeleteTicketMutation,
  useUpdateTicketMutation,
} from "@/store/ticketsApi";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { EditTicketModal } from "./EditTicketModal";

interface TicketRowProps {
  ticket: Ticket;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

export function TicketRow({ ticket }: TicketRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isCustomer = session?.user?.role === "CUSTOMER";

  const [deleteTicket, { isLoading: isDeleting }] = useDeleteTicketMutation();
  const [updateTicket, { isLoading: isUpdating }] = useUpdateTicketMutation();

  async function handleConfirmDelete() {
    setDeleteError(null);
    try {
      await deleteTicket(ticket.id).unwrap();
    } catch {
      setDeleteError("Delete failed.");
      setConfirming(false);
    }
  }

  async function handleStatusChange(status: Status) {
    setUpdateError(null);
    try {
      await updateTicket({ id: ticket.id, body: { status } }).unwrap();
    } catch {
      setUpdateError("Status update failed.");
    }
  }

  async function handlePriorityChange(priority: Priority) {
    setUpdateError(null);
    try {
      await updateTicket({ id: ticket.id, body: { priority } }).unwrap();
    } catch {
      setUpdateError("Priority update failed.");
    }
  }

  return (
    <>
      <tr className="group" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {/* ID */}
        <td
          className="px-3 py-3 font-mono text-[11px] whitespace-nowrap"
          style={{ color: "var(--text-muted)", width: "72px" }}
        >
          #{shortId(ticket.id)}
        </td>

        {/* Title + Project Badge */}
        <td className="px-3 py-3 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/tickets/${ticket.id}`}
              className="font-medium text-sm leading-snug hover:underline line-clamp-1 block"
              style={{ color: "var(--text-primary)" }}
            >
              {ticket.title}
            </Link>
            {ticket.project ? (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800 whitespace-nowrap">
                {ticket.project.name}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 whitespace-nowrap">
                Other
              </span>
            )}
          </div>
          {(updateError || deleteError) && (
            <p className="text-[11px] text-red-500 mt-1">
              {updateError || deleteError}
            </p>
          )}
        </td>

        {/* Status */}
        <td className="px-3 py-3 whitespace-nowrap">
          {isCustomer ? (
            <StatusBadge status={ticket.status} />
          ) : (
            <select
              value={ticket.status}
              disabled={isUpdating || !ticket.assignedToId}
              title={!ticket.assignedToId ? "Assign ticket to update status" : undefined}
              onChange={(e) => handleStatusChange(e.target.value as Status)}
              className="input-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: "4px 8px", fontSize: "12px", width: "auto", minWidth: "110px" }}
            >
              {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as Status[]).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          )}
        </td>

        {/* Priority */}
        <td className="px-3 py-3 whitespace-nowrap">
          {isCustomer ? (
            <PriorityBadge priority={ticket.priority} />
          ) : (
            <select
              value={ticket.priority}
              disabled={isUpdating}
              onChange={(e) => handlePriorityChange(e.target.value as Priority)}
              className="input-base cursor-pointer disabled:opacity-50"
              style={{ padding: "4px 8px", fontSize: "12px", width: "auto", minWidth: "90px" }}
            >
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </td>

        {/* Assignee */}
        <td className="px-3 py-3 whitespace-nowrap">
          {ticket.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <span
                className="avatar w-5 h-5 text-white"
                style={{ background: "#0ea5e9", fontSize: "9px" }}
              >
                {getInitials(ticket.assignedTo.name)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {ticket.assignedTo.name}
              </span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Unassigned
            </span>
          )}
        </td>

        {/* Created */}
        <td
          className="px-3 py-3 whitespace-nowrap text-xs"
          style={{ color: "var(--text-muted)" }}
          title={new Date(ticket.createdAt).toLocaleString()}
        >
          {relativeTime(ticket.createdAt)}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 whitespace-nowrap w-28">
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-2 py-1 rounded-md text-[11px] font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: "#ef4444" }}
              >
                {isDeleting ? "…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isDeleting}
                className="px-2 py-1 rounded-md text-[11px] font-medium disabled:opacity-50"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-0)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }}
              >
                Edit
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: "transparent",
                    color: "#ef4444",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </td>
      </tr>

      <EditTicketModal
        ticket={ticket}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
