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

export function EditTicketModal({ ticket, isOpen, onClose }: EditTicketModalProps) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [workDone, setWorkDone] = useState(ticket.workDone || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [updateTicket, { isLoading }] = useUpdateTicketMutation();
  const { data: session } = useSession();

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

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const body: Record<string, string> = {};
      if (title !== ticket.title) body.title = title;
      if (description !== ticket.description) body.description = description;
      if (workDone !== (ticket.workDone || "")) body.workDone = workDone;

      await updateTicket({ id: ticket.id, body }).unwrap();
      onClose();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Failed to update ticket. Please try again."));
    }
  }

  const isOwner = session?.user?.id === ticket.createdById;
  const canEditWorkDone = session?.user?.role === "AGENT" || session?.user?.role === "ADMIN";

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-ticket-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2
              id="edit-ticket-heading"
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Edit Ticket
            </h2>
            <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
              #{ticket.id.slice(-6).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {isOwner ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Title
                </label>
                <input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                  className="input-base"
                  placeholder="Ticket title"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-description" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={4}
                  className="input-base"
                  style={{ resize: "vertical" }}
                />
              </div>
            </>
          ) : (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Original Ticket
              </p>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {ticket.title}
              </h3>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {ticket.description}
              </p>
            </div>
          )}

          {canEditWorkDone && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-work-done" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Agent Progress
              </label>
              <textarea
                id="edit-work-done"
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                placeholder="Describe the progress or work done so far..."
                rows={3}
                className="input-base"
                style={{ resize: "vertical" }}
              />
            </div>
          )}

          {formError && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
