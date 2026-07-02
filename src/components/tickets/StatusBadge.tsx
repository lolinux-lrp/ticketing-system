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

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
