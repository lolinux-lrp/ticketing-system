"use client";

import { useState } from "react";
import type { Priority, Status, Ticket } from "@/types";
import {
  useDeleteTicketMutation,
  useUpdateTicketMutation,
} from "@/store/ticketsApi";
import { StatusSelect } from "./StatusSelect";
import { PrioritySelect } from "./PrioritySelect";
import { EditTicketModal } from "./EditTicketModal";

interface TicketRowProps {
  ticket: Ticket;
}

export function TicketRow({ ticket }: TicketRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteTicket, { isLoading: isDeleting }] = useDeleteTicketMutation();
  const [updateTicket, { isLoading: isUpdating }] = useUpdateTicketMutation();

  async function handleConfirmDelete() {
    setDeleteError(null);
    try {
      await deleteTicket(ticket.id).unwrap();
      // No need to reset local state on success: tag invalidation triggers
      // a list refetch and this row unmounts once the ticket disappears.
    } catch {
      setDeleteError("Failed to delete ticket. Please try again.");
      setConfirming(false);
    }
  }

  async function handleStatusChange(status: Status) {
    setUpdateError(null);
    try {
      await updateTicket({ id: ticket.id, body: { status } }).unwrap();
    } catch {
      setUpdateError("Failed to update status.");
    }
  }

  async function handlePriorityChange(priority: Priority) {
    setUpdateError(null);
    try {
      await updateTicket({ id: ticket.id, body: { priority } }).unwrap();
    } catch {
      setUpdateError("Failed to update priority.");
    }
  }

  return (
    <tr className="bg-slate-950 hover:bg-slate-900/60">
      <td className="max-w-xs px-4 py-3">
        <div className="font-medium text-slate-100">{ticket.title}</div>
        <div className="truncate text-xs text-slate-500">
          {ticket.description}
        </div>
        {updateError && (
          <p className="mt-1 text-xs text-red-400">{updateError}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusSelect
          status={ticket.status}
          onChange={handleStatusChange}
          disabled={isUpdating}
        />
      </td>
      <td className="px-4 py-3">
        <PrioritySelect
          priority={ticket.priority}
          onChange={handlePriorityChange}
          disabled={isUpdating}
        />
      </td>
      <td className="px-4 py-3 text-slate-300">{ticket.createdBy.name}</td>
      <td className="px-4 py-3 text-slate-500">
        {new Date(ticket.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Are you sure?</span>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="rounded-md border border-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md border border-slate-800 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>
        )}
        {deleteError && (
          <p className="mt-1 text-xs text-red-400">{deleteError}</p>
        )}
      </td>
      <EditTicketModal
        ticket={ticket}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </tr>
  );
}
