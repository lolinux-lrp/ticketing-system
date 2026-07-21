"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  useGetTicketQuery,
  useUpdateTicketMutation,
} from "@/store/ticketsApi";
import { useGetAgentsQuery } from "@/store/usersApi";
import { TicketCommentsSection } from "@/components/comments/TicketCommentsSection";
import { AssigneeSearch } from "@/components/tickets/AssigneeSearch";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import { TicketMeetingsCard } from "@/components/tickets/TicketMeetingsCard";
import type { Status, Priority, Ticket } from "@/types";
import { formatResolutionTime } from "@/lib/utils/resolutionTime";

const statusOptions: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorityOptions: Priority[] = ["P4", "P3", "P2", "P1"];

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }} title={label}>
        {label}
      </span>
      <span className="text-sm min-w-0 w-full" style={{ color: "var(--text-secondary)" }}>
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text-secondary)" }}>
              {ticket.description}
            </p>
          </div>

          <ResolutionSection 
            ticket={ticket} 
            updateTicket={updateTicket} 
            canManage={canManage} 
            ticketId={ticketId} 
          />
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
                  disabled={!ticket.assignedToId}
                  title={!ticket.assignedToId ? "Assign ticket to update status" : undefined}
                  onChange={(e) =>
                    updateTicket({ id: ticketId, body: { status: e.target.value as Status } })
                  }
                  className="input-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontSize: "13px", padding: "7px 10px" }}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
                {!ticket.assignedToId && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Assign ticket to update status
                  </p>
                )}
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

            <MetaRow label="Created by" value={<span className="block truncate w-full" title={ticket.createdBy?.name ?? "—"}>{ticket.createdBy?.name ?? "—"}</span>} />
            <MetaRow
              label="Assigned to"
              value={ticket.assignedTo?.name ? (
                <span className="block truncate w-full" title={ticket.assignedTo.name}>{ticket.assignedTo.name}</span>
              ) : (
                <span className="block truncate w-full" style={{ color: "var(--text-muted)" }}>Unassigned</span>
              )}
            />
            {ticket.project && (
              <MetaRow label="Project" value={
                <span className="px-2 py-0.5 rounded text-xs font-semibold block truncate w-full" title={ticket.project.name} style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
                  {ticket.project.name}
                </span>
              } />
            )}
            {ticket.contactEmail && (
              <MetaRow label="Contact Email" value={
                <a href={`mailto:${ticket.contactEmail}`} className="text-blue-500 hover:underline block truncate w-full" title={ticket.contactEmail}>
                  {ticket.contactEmail}
                </a>
              } />
            )}
            <div className="h-px" style={{ background: "var(--border)" }} />
            <MetaRow
              label="Created"
              value={new Date(ticket.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            />
            <MetaRow
              label="Last updated"
              value={new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            />
            <div className="h-px" style={{ background: "var(--border)" }} />
            <MetaRow
              label="Resolved at"
              value={
                ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"
                  ? <span style={{ color: "var(--text-muted)" }}>Pending</span>
                  : new Date(ticket.resolvedAt ?? ticket.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
              }
            />
            <MetaRow
              label="Resolution time"
              value={
                ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"
                  ? <span style={{ color: "var(--text-muted)" }}>Pending</span>
                  : formatResolutionTime(ticket.createdAt, ticket.resolvedAt ?? ticket.updatedAt)
              }
            />
          </div>

          <TicketMeetingsCard 
            ticketId={ticketId} 
            ticketTitle={ticket.title}
            customerUserId={ticket.createdById}
            agentUserId={ticket.assignedToId}
          />
        </div>
      </div>
    </div>
  );
}
function ResolutionSection({ ticket, updateTicket, canManage, ticketId }: { ticket: Ticket, updateTicket: (arg: { id: string, body: { resolution: string } }) => { unwrap: () => Promise<Ticket> }, canManage: boolean, ticketId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(ticket.resolution || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTicket({ id: ticketId, body: { resolution: draft } }).unwrap();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save resolution", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage && !ticket.resolution) {
    return (
      <div className="rounded-xl p-5 mb-4" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand)" }}>Resolution Notes</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words italic opacity-50" style={{ color: "var(--text-secondary)" }}>
          No resolution recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
          Resolution Notes
        </p>
        {canManage && !isEditing && (
          <button onClick={() => { setDraft(ticket.resolution || ""); setIsEditing(true); }} className="text-xs font-medium hover:underline transition-colors" style={{ color: "var(--brand)" }}>
            Edit
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input-base w-full resize-y min-h-[100px]"
            placeholder="Enter resolution notes..."
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: "var(--brand)" }}>
              {isSaving && <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isSaving ? "Saving..." : "Save Resolution"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text-secondary)" }}>
          {ticket.resolution || <span className="italic opacity-50">No resolution recorded yet.</span>}
        </p>
      )}
    </div>
  );
}
