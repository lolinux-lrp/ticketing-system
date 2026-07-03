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

  // `mine` is client-only UI state; translate it into the `createdById`
  // param the backend actually filters on.
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
  } = useGetTicketsQuery(apiFilters);

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.search || filters.mine,
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Tickets</h1>
          <p className="text-sm text-slate-400">
            {tickets
              ? `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}${
                  isFetching ? " · updating..." : ""
                }`
              : "Loading..."}
          </p>
        </div>
      </header>

      <TicketFilters
        filters={filters}
        onChange={setFilters}
        showMineToggle={Boolean(session)}
      />

      <div className="overflow-hidden rounded-lg border border-slate-800">
        {isLoading && (
          <div className="p-8 text-center text-sm text-slate-400">
            Loading tickets...
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-sm text-red-400">
            Failed to load tickets.
            {error && "status" in error ? ` (status: ${error.status})` : ""}
          </div>
        )}

        {!isLoading && !isError && tickets && tickets.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            {hasActiveFilters
              ? "No tickets match your filters."
              : "No tickets yet."}
          </div>
        )}

        {!isLoading && !isError && tickets && tickets.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
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
