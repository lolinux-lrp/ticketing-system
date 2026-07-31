"use client";

import React, { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useGetProjectsQuery } from "@/store/ticketsApi";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: projects } = useGetProjectsQuery();

  const timeframe = searchParams.get("timeframe") || "month";
  const priority = searchParams.get("priority") || "all";
  const projectId = searchParams.get("projectId") || "all";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (name: string, value: string) => {
    const newQueryString = createQueryString(name, value);
    router.push(pathname + "?" + newQueryString);
  };

  return (
    <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="timeframe" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Timeframe
          </label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => handleFilterChange("timeframe", e.target.value)}
            className="input-base px-3 py-2 text-sm w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="priority" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="input-base px-3 py-2 text-sm w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
          >
            <option value="all">All Priorities</option>
            <option value="P4">Low (P4)</option>
            <option value="P3">Medium (P3)</option>
            <option value="P2">High (P2)</option>
            <option value="P1">Critical (P1)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="project" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Project
          </label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => handleFilterChange("projectId", e.target.value)}
            className="input-base px-3 py-2 text-sm w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
          >
            <option value="all">All Projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {timeframe === "custom" && (
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[var(--border)]">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="input-base px-3 py-2 text-sm w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="endDate" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="input-base px-3 py-2 text-sm w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div className="flex-1 hidden sm:block"></div>
        </div>
      )}
    </div>
  );
}
