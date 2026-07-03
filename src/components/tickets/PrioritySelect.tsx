"use client";

import type { Priority } from "@/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  MEDIUM: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/30",
};

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface PrioritySelectProps {
  priority: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

export function PrioritySelect({
  priority,
  onChange,
  disabled,
}: PrioritySelectProps) {
  return (
    <select
      value={priority}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Priority)}
      aria-label="Change ticket priority"
      className={`cursor-pointer rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-50 ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_OPTIONS.map((option) => (
        <option
          key={option}
          value={option}
          className="bg-slate-900 text-slate-100"
        >
          {formatLabel(option)}
        </option>
      ))}
    </select>
  );
}
