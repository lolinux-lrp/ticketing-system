"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCreateTicketMutation } from "@/store/ticketsApi";
import type { Priority } from "@/types";
import { extractErrorMessage } from "./extractErrorMessage";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function CreateTicketForm() {
  const { data: session, status } = useSession();
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(false);

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

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setSuccessMessage(true);
    } catch (err) {
      setFormError(
        extractErrorMessage(err, "Failed to create ticket. Please try again."),
      );
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading session...</p>;
  }

  if (!session) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        You must be logged in to create a ticket.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6"
    >
      <h2 className="text-lg font-semibold text-slate-50">New Ticket</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium text-slate-300">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="description"
          className="text-sm font-medium text-slate-300"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={4}
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="priority"
          className="text-sm font-medium text-slate-300"
        >
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0) + option.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {formError && <p className="text-sm text-red-400">{formError}</p>}
      {successMessage && (
        <p className="text-sm text-emerald-400">Ticket created!</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-slate-50 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
      >
        {isLoading ? "Creating..." : "Create Ticket"}
      </button>
    </form>
  );
}
