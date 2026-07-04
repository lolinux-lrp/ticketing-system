"use client";

import type { Status } from "@/types";

const STATUS_STYLES: Record<Status, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

const STATUS_LABELS: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_OPTIONS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

interface StatusSelectProps {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
}

export function StatusSelect({ status, onChange, disabled }: StatusSelectProps) {
  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Status)}
      aria-label="Change ticket status"
      className={`cursor-pointer rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-50 ${STATUS_STYLES[status]}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option
          key={option}
          value={option}
          className="bg-slate-900 text-slate-100"
        >
          {STATUS_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
