"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Ticket } from "@/types";
import { useUpdateTicketMutation } from "@/store/ticketsApi";
import { extractErrorMessage } from "./extractErrorMessage";
import { useSession } from "next-auth/react";

interface EditTicketModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTicketModal({
  ticket,
  isOpen,
  onClose,
}: EditTicketModalProps) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [workDone, setWorkDone] = useState(ticket.workDone || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [updateTicket, { isLoading }] = useUpdateTicketMutation();
  const { data: session } = useSession();

  // Reset the form to the ticket's current values every time the modal opens.
  // Adjusting state during render (rather than in an effect) avoids an
  // extra cascading render pass.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setWorkDone(ticket.workDone || "");
      setFormError(null);
    }
  }

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    try {
      const body: any = {};
      if (title !== ticket.title) body.title = title;
      if (description !== ticket.description) body.description = description;
      if (workDone !== (ticket.workDone || "")) body.workDone = workDone;

      await updateTicket({
        id: ticket.id,
        body,
      }).unwrap();
      onClose();
    } catch (err) {
      setFormError(
        extractErrorMessage(err, "Failed to update ticket. Please try again."),
      );
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-ticket-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="edit-ticket-heading"
            className="text-lg font-semibold text-slate-50"
          >
            Edit Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {session?.user?.id === ticket.createdById ? (
            <>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-title"
                  className="text-sm font-medium text-slate-300"
                >
                  Title
                </label>
                <input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                  className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-description"
                  className="text-sm font-medium text-slate-300"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={4}
                  className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>
            </>
          ) : (
            <div className="rounded-md bg-slate-900/50 border border-slate-800 p-4">
              <p className="text-sm text-slate-400 mb-2">Original Ticket Details</p>
              <h3 className="font-medium text-slate-200">{ticket.title}</h3>
              <p className="text-sm text-slate-300 mt-1">{ticket.description}</p>
            </div>
          )}

          {(session?.user?.role === "AGENT" || session?.user?.role === "ADMIN") && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="edit-work-done"
                className="text-sm font-medium text-slate-300"
              >
                Agent Progress (Work Done)
              </label>
              <textarea
                id="edit-work-done"
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                placeholder="Describe the progress or work done so far..."
                rows={3}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </div>
          )}

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-slate-50 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
