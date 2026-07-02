"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Priority, Status } from "@/types";

export interface TicketFiltersState {
  status?: Status;
  priority?: Priority;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  /**
   * Client-only UI toggle. Resolved to a real `createdById` value (from the
   * current session) before being sent to the backend - see TicketsDashboard.
   */
  mine?: boolean;
}

const VALID_STATUS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const VALID_PRIORITY: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "title",
  "priority",
  "status",
];

/**
 * Reads/writes ticket filters directly to and from the URL query string.
 * The URL is the single source of truth, so filters survive page refreshes
 * and can be shared/bookmarked. `router.replace` is used (not `push`) so
 * tweaking filters doesn't spam the browser history.
 */
export function useTicketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<TicketFiltersState>(() => {
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy");
    const order = searchParams.get("order");
    const mine = searchParams.get("mine");

    return {
      status: VALID_STATUS.includes(status as Status)
        ? (status as Status)
        : undefined,
      priority: VALID_PRIORITY.includes(priority as Priority)
        ? (priority as Priority)
        : undefined,
      search: search || undefined,
      sortBy:
        sortBy && VALID_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt",
      order: order === "asc" ? "asc" : "desc",
      mine: mine === "true",
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (next: TicketFiltersState) => {
      const params = new URLSearchParams();
      if (next.status) params.set("status", next.status);
      if (next.priority) params.set("priority", next.priority);
      if (next.search) params.set("search", next.search);
      if (next.sortBy && next.sortBy !== "createdAt") {
        params.set("sortBy", next.sortBy);
      }
      if (next.order && next.order !== "desc") {
        params.set("order", next.order);
      }
      if (next.mine) params.set("mine", "true");

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  return [filters, setFilters] as const;
}
