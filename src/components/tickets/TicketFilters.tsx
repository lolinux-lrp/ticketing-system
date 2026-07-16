"use client";

import { useEffect, useState } from "react";
import type { Priority, Status } from "@/types";
import type { TicketFiltersState } from "./useTicketFilters";
import { useGetProjectsQuery } from "@/store/ticketsApi";
import { useSession } from "next-auth/react";
import { useGetAgentsQuery } from "@/store/usersApi";
import { AssignedToFilter } from "./AssignedToFilter";

const STATUS_OPTIONS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_LABELS: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

interface TicketFiltersProps {
  filters: TicketFiltersState;
  onChange: (filters: TicketFiltersState) => void;
  showMineToggle: boolean;
}

function FilterChip({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer select-none"
      style={{
        background: active ? "var(--brand-subtle)" : "var(--surface-2)",
        color: active ? "var(--brand)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
      }}
    >
      {label}
      {children}
    </span>
  );
}

export function TicketFilters({
  filters,
  onChange,
  showMineToggle,
}: TicketFiltersProps) {
  const { data: session } = useSession();
  const { data: agents } = useGetAgentsQuery(undefined, { 
    skip: !session || session.user.role !== "ADMIN" 
  });
  const { data: projects } = useGetProjectsQuery();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    setSearchInput(filters.search ?? "");
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        onChange({ ...filters, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, filters, onChange]);

  const hasActive = Boolean(
    filters.status || filters.priority || filters.search || filters.mine || filters.startDate || filters.endDate
  );

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <div className="relative flex items-center">
        <svg
          className="absolute left-2.5 pointer-events-none"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-muted)" }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search tickets..."
          className="input-base pl-8"
          style={{
            width: "200px",
            padding: "6px 10px 6px 30px",
            fontSize: "12px",
          }}
        />
      </div>

      <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status:</span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                status: filters.status === s ? undefined : s,
              })
            }
          >
            <FilterChip label={STATUS_LABELS[s]} active={filters.status === s} />
          </button>
        ))}
      </div>

      <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Priority:</span>
        {PRIORITY_OPTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                priority: filters.priority === p ? undefined : p,
              })
            }
          >
            <FilterChip label={PRIORITY_LABELS[p]} active={filters.priority === p} />
          </button>
        ))}
      </div>

      {showMineToggle && session?.user && (
        <>
          <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />
          <AssignedToFilter
            users={agents || []}
            currentUserId={session.user.id}
            role={session.user.role as "ADMIN" | "AGENT" | "CUSTOMER"}
            value={filters.assignedToId}
            onChange={(userId) => onChange({ ...filters, assignedToId: userId })}
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[var(--surface-0)] border border-[var(--border)] rounded-md px-2 overflow-hidden">
          <input
            type="date"
            value={filters.startDate ?? ""}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
            className="bg-transparent text-[11px] outline-none"
            style={{ color: "var(--text-secondary)", padding: "4px 0" }}
            title="Start Date"
          />
          <span className="text-[10px] text-[var(--text-muted)]">-</span>
          <input
            type="date"
            value={filters.endDate ?? ""}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
            className="bg-transparent text-[11px] outline-none"
            style={{ color: "var(--text-secondary)", padding: "4px 0" }}
            title="End Date"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            if (filters.startDate) params.set("startDate", filters.startDate);
            if (filters.endDate) params.set("endDate", filters.endDate);
            window.location.href = `/api/tickets/export?${params.toString()}`;
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          title="Export to CSV"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export CSV
        </button>
        <select
          value={filters.projectId ?? ""}
          onChange={(e) => onChange({ ...filters, projectId: e.target.value || undefined })}
          className="input-base"
          style={{ padding: "5px 8px", fontSize: "12px", width: "auto" }}
        >
          <option value="">All Projects</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={filters.sortBy ?? "createdAt"}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
          className="input-base"
          style={{ padding: "5px 8px", fontSize: "12px", width: "auto" }}
        >
          <option value="createdAt">Sort: Created</option>
          <option value="updatedAt">Sort: Updated</option>
          <option value="priority">Sort: Priority</option>
          <option value="status">Sort: Status</option>
          <option value="title">Sort: Title</option>
        </select>
        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, order: filters.order === "asc" ? "desc" : "asc" })
          }
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
          title={filters.order === "asc" ? "Ascending" : "Descending"}
        >
          {filters.order === "asc" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>
            </svg>
          )}
        </button>

        {hasActive && (
          <button
            type="button"
            onClick={() => onChange({ sortBy: filters.sortBy, order: filters.order })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
