"use client";

import { useEffect, useState } from "react";
import type { Priority, Status } from "@/types";
import type { TicketFiltersState } from "./useTicketFilters";

const STATUS_OPTIONS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "title", label: "Title" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface TicketFiltersProps {
  filters: TicketFiltersState;
  onChange: (filters: TicketFiltersState) => void;
  showMineToggle: boolean;
}

export function TicketFilters({
  filters,
  onChange,
  showMineToggle,
}: TicketFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Keep the input in sync if filters change externally (Clear filters,
  // browser back/forward navigation through URL-synced state). Adjusting
  // state during render (rather than in an effect) avoids an extra
  // cascading render pass.
  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    setSearchInput(filters.search ?? "");
  }

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        onChange({ ...filters, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.search || filters.mine,
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="search" className="text-xs font-medium text-slate-400">
          Search
        </label>
        <input
          id="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title or description..."
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-slate-400">
          Status
        </label>
        <select
          id="status"
          value={filters.status ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              status: (e.target.value || undefined) as Status | undefined,
            })
          }
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="priority"
          className="text-xs font-medium text-slate-400"
        >
          Priority
        </label>
        <select
          id="priority"
          value={filters.priority ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              priority: (e.target.value || undefined) as Priority | undefined,
            })
          }
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="">All</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sortBy" className="text-xs font-medium text-slate-400">
          Sort by
        </label>
        <select
          id="sortBy"
          value={filters.sortBy ?? "createdAt"}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="order" className="text-xs font-medium text-slate-400">
          Order
        </label>
        <select
          id="order"
          value={filters.order ?? "desc"}
          onChange={(e) =>
            onChange({ ...filters, order: e.target.value as "asc" | "desc" })
          }
          className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {showMineToggle && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-400">Scope</span>
          <label className="flex h-[38px] items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={filters.mine ?? false}
              onChange={(e) => onChange({ ...filters, mine: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-slate-50"
            />
            My tickets
          </label>
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({ sortBy: filters.sortBy, order: filters.order })
          }
          className="rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
