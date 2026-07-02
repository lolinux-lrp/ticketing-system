import type { Priority } from "@/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  MEDIUM: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}
    >
      {priority.toLowerCase()}
    </span>
  );
}
