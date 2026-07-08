"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  useGetTicketQuery,
  useUpdateTicketMutation,
  useGetAgentsQuery,
} from "@/store/ticketsApi";
import { TicketCommentsSection } from "@/components/comments/TicketCommentsSection";
import { AssigneeSearch } from "@/components/tickets/AssigneeSearch";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import type { Status, Priority } from "@/types";

const statusOptions: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorityOptions: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const { data: session, status } = useSession();
  const { data, isLoading, isError } = useGetTicketQuery(ticketId);
  const { data: agents } = useGetAgentsQuery(undefined, {
    skip: session?.user?.role !== "ADMIN",
  });
  const [updateTicket] = useUpdateTicketMutation();

  const isAdmin = session?.user?.role === "ADMIN";
  const isAgent = session?.user?.role === "AGENT";
  const canManage = isAdmin || isAgent;

  const router = useRouter();

  // Redirect unauthenticated users to login, preserving the current URL as callbackUrl
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded mb-6" style={{ background: "var(--surface-2)" }} />
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="h-8 w-3/4 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-4 w-full rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-4 w-5/6 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
            <div className="w-72 space-y-3 shrink-0">
              <div className="h-24 rounded-xl" style={{ background: "var(--surface-2)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <div
          className="rounded-xl p-8"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
        >
          <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Ticket not found</p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
            This ticket may have been deleted or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { ticket } = data;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          All Tickets
        </Link>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              #{ticket.id.slice(-6).toUpperCase()}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <h1
            className="text-2xl font-bold tracking-tight leading-snug mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {ticket.title}
          </h1>

          <div
            className="rounded-xl p-5 mb-4"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Description
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {ticket.description}
            </p>
          </div>

          {ticket.workDone && (
            <div
              className="rounded-xl p-5 mb-4"
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand)" }}>
                Agent Progress
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {ticket.workDone}
              </p>
            </div>
          )}

          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border)",
            }}
          >
            <TicketCommentsSection ticketId={ticketId} />
          </div>
        </div>

        <div
          className="w-72 shrink-0 flex flex-col gap-3"
          style={{ position: "sticky", top: "calc(var(--topbar-height) + 24px)" }}
        >
          {canManage && (
            <div
              className="rounded-xl p-4 flex flex-col gap-4"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Manage
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Status
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) =>
                    updateTicket({ id: ticketId, body: { status: e.target.value as Status } })
                  }
                  className="input-base cursor-pointer"
                  style={{ fontSize: "13px", padding: "7px 10px" }}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Priority
                </label>
                <select
                  value={ticket.priority}
                  onChange={(e) =>
                    updateTicket({ id: ticketId, body: { priority: e.target.value as Priority } })
                  }
                  className="input-base cursor-pointer"
                  style={{ fontSize: "13px", padding: "7px 10px" }}
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Assignee
                  </label>
                  <AssigneeSearch
                    agents={agents}
                    assignedToId={ticket.assignedToId}
                    onChange={(newId) =>
                      updateTicket({ id: ticketId, body: { assignedToId: newId } })
                    }
                  />
                </div>
              )}

              {isAgent && ticket.assignedToId !== session?.user?.id && (
                <button
                  onClick={() =>
                    updateTicket({ id: ticketId, body: { assignedToId: session?.user?.id } })
                  }
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: "var(--brand-subtle)",
                    color: "var(--brand)",
                    border: "1px solid var(--brand)",
                  }}
                >
                  Assign to me
                </button>
              )}
              {isAgent && ticket.assignedToId === session?.user?.id && (
                <button
                  onClick={() =>
                    updateTicket({ id: ticketId, body: { assignedToId: null } })
                  }
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  Unassign me
                </button>
              )}
            </div>
          )}

          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Details
            </p>

            <MetaRow label="Created by" value={ticket.createdBy?.name ?? "—"} />
            <MetaRow
              label="Assigned to"
              value={ticket.assignedTo?.name ?? (
                <span style={{ color: "var(--text-muted)" }}>Unassigned</span>
              )}
            />
            <div className="h-px" style={{ background: "var(--border)" }} />
            <MetaRow
              label="Created"
              value={new Date(ticket.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
            <MetaRow
              label="Last updated"
              value={new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}