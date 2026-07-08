"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useCreateTicketMutation } from "@/store/ticketsApi";
import type { Priority } from "@/types";
import { extractErrorMessage } from "./extractErrorMessage";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
};

interface CreateTicketSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketSlideOver({ isOpen, onClose }: CreateTicketSlideOverProps) {
  const { data: session } = useSession();
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTitle(""); setDescription(""); setPriority("MEDIUM");
      setFormError(null); setSuccess(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);
    if (!session?.user?.id) {
      setFormError("You must be logged in to create a ticket.");
      return;
    }
    try {
      await createTicket({
        title,
        description,
        priority,
        createdById: session.user.id,
      }).unwrap();
      setTitle(""); setDescription(""); setPriority("MEDIUM");
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    } catch (err) {
      setFormError(extractErrorMessage(err, "Failed to create ticket. Please try again."));
    }
  }

  return createPortal(
    <>
      <div
        className="slide-over-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="slide-over-panel flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ticket-heading"
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2
              id="create-ticket-heading"
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              New Ticket
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Submit a new support request
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 flex-1">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ct-title"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Title
            </label>
            <input
              id="ct-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={200}
              className="input-base"
              placeholder="What do you need help with?"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ct-description"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Description
            </label>
            <textarea
              id="ct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={6}
              className="input-base resize-none"
              placeholder="Provide detailed information about the issue..."
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ct-priority"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: priority === p ? "var(--brand)" : "var(--surface-2)",
                    color: priority === p ? "white" : "var(--text-secondary)",
                    border: `1px solid ${priority === p ? "var(--brand)" : "var(--border)"}`,
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              {formError}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Ticket created successfully!
            </div>
          )}

          <div className="mt-auto pt-4 border-t flex gap-3" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                  Creating...
                </span>
              ) : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

export { CreateTicketSlideOver as CreateTicketForm };
