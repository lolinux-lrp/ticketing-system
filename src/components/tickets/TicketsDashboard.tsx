"use client";

import { useSession } from "next-auth/react";
import { useGetTicketsQuery } from "@/store/ticketsApi";
import type { GetTicketsParams } from "@/types";
import { TicketFilters } from "./TicketFilters";
import { TicketRow } from "./TicketRow";
import { useTicketFilters } from "./useTicketFilters";

export function TicketsDashboard() {
  const { data: session } = useSession();
  const [filters, setFilters] = useTicketFilters();

  const { mine, ...restFilters } = filters;
  const apiFilters: GetTicketsParams = {
    ...restFilters,
    createdById: mine && session?.user?.id ? session.user.id : undefined,
  };

  const {
    data: tickets,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetTicketsQuery(apiFilters, { pollingInterval: 15000, skipPollingIfUnfocused: true });

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.search || filters.mine
  );

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-0)",
        minHeight: "100%",
      }}
    >
      {/* Filter bar */}
      <TicketFilters
        filters={filters}
        onChange={setFilters}
        showMineToggle={Boolean(session)}
      />

      {/* Ticket count / fetching indicator */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
          background: "var(--surface-0)",
        }}
      >
        <span>
          {tickets
            ? `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`
            : "Loading..."}
          {isFetching && !isLoading && (
            <span className="ml-2 animate-pulse">· refreshing</span>
          )}
        </span>
        {hasActiveFilters && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
          >
            Filtered
          </span>
        )}
      </div>

      {/* Data grid */}
      <div style={{ overflowX: "auto" }}>
        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3.5 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="h-3 w-14 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-3 flex-1 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-5 w-20 rounded-full" style={{ background: "var(--surface-2)" }} />
                <div className="h-5 w-16 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-3 w-24 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-3 w-16 rounded" style={{ background: "var(--surface-2)" }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="p-12 text-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
              style={{ background: "rgba(239,68,68,0.1)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Failed to load tickets
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {error && "status" in error ? `Status ${error.status}` : "Please try again"}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && tickets && tickets.length === 0 && (
          <div className="p-12 text-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
              style={{ background: "var(--surface-2)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect width="6" height="4" x="9" y="3" rx="1"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {hasActiveFilters ? "No tickets match your filters" : "No tickets yet"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {hasActiveFilters
                ? "Try adjusting your filters above"
                : "Click \"+ New Ticket\" in the top bar to create one"}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && tickets && tickets.length > 0 && (
          <table className="data-grid">
            <thead>
              <tr>
                <th style={{ width: "72px" }}>ID</th>
                <th>Title</th>
                <th style={{ width: "130px" }}>Status</th>
                <th style={{ width: "110px" }}>Priority</th>
                <th style={{ width: "140px" }}>Assignee</th>
                <th style={{ width: "90px" }}>Created</th>
                <th style={{ width: "110px" }} />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
