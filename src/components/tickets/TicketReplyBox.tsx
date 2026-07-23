"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCreateTicketMessageMutation } from "@/store/ticketsApi";
import type { Ticket, Status } from "@/types";

interface TicketReplyBoxProps {
  ticket: Ticket;
  ticketId: string;
}

export function TicketReplyBox({ ticket, ticketId }: TicketReplyBoxProps) {
  const { data: session } = useSession();
  const [createMessage, { isLoading }] = useCreateTicketMessageMutation();

  const isAgent = session?.user?.role === "AGENT" || session?.user?.role === "ADMIN";

  const [content, setContent] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [newStatus, setNewStatus] = useState<Status | "">("");
  const [showRecipients, setShowRecipients] = useState(false);

  useEffect(() => {
    if (isAgent && !to) {
      const clientMessages = ticket.messages?.filter((m) => m.senderType === "CLIENT") || [];
      const lastClientMessage = clientMessages[clientMessages.length - 1];
      // eslint-disable-next-line
      setTo(lastClientMessage?.senderEmail || ticket.createdBy?.email || ticket.contactEmail || "");
      
      if (ticket.ccEmails && Array.isArray(ticket.ccEmails) && ticket.ccEmails.length > 0) {
        setCc(ticket.ccEmails.join(", "));
      }
      setShowRecipients(true);
    }
  }, [isAgent, ticket, to]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Message content cannot be empty");
      return;
    }

    try {
      await createMessage({
        id: ticketId,
        body: {
          content,
          to: to || undefined,
          cc: cc || undefined,
          bcc: bcc || undefined,
          newStatus: newStatus ? (newStatus as Status) : undefined,
        },
      }).unwrap();

      setContent("");
      if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
        setNewStatus("");
      }
    } catch (err) {
      setError(
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error || "Failed to send message"
          : "Failed to send message"
      );
    }
  };

  return (
    <div
      className="mt-6 rounded-xl overflow-hidden"
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--border)",
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {showRecipients && (
          <div className="flex flex-col border-b" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
            <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">To:</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0"
                placeholder="recipient@example.com"
              />
              <button 
                type="button" 
                onClick={() => setShowRecipients(false)}
                className="text-xs text-gray-400 hover:text-gray-600 ml-2"
              >
                Hide
              </button>
            </div>
            <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">Cc:</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0"
                placeholder="cc@example.com"
              />
            </div>
            <div className="flex items-center px-4 py-2">
              <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">Bcc:</span>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0"
                placeholder="bcc@example.com"
              />
            </div>
          </div>
        )}
        
        <div className="relative">
          {!showRecipients && isAgent && (
            <button
              type="button"
              onClick={() => setShowRecipients(true)}
              className="absolute top-3 right-4 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors z-10"
            >
              Cc / Bcc
            </button>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full bg-transparent p-4 text-sm focus:outline-none focus:ring-0 resize-y min-h-[120px]"
            required
          />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs font-medium border-t border-red-100">
            {error}
          </div>
        )}

        <div 
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
        >
          <div className="flex items-center gap-2">
            {isAgent && (
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Status | "")}
                className="text-xs border rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <option value="">Keep current status ({ticket.status})</option>
                {ticket.status !== "OPEN" && <option value="OPEN">Mark as Open</option>}
                {ticket.status !== "IN_PROGRESS" && <option value="IN_PROGRESS">Mark In Progress</option>}
                {ticket.status !== "RESOLVED" && <option value="RESOLVED">Mark as Resolved</option>}
                {ticket.status !== "CLOSED" && <option value="CLOSED">Mark as Closed</option>}
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reply"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
