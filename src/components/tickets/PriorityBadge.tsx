import type { Priority } from "@/types";

function IconUrgent() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="m5 19 7-7 7 7"/>
    </svg>
  );
}
function IconHigh() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  );
}
function IconMedium() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
    </svg>
  );
}
function IconLow() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

const PRIORITY_MAP: Record<Priority, { label: string; cls: string; icon: React.ReactNode }> = {
  URGENT: { label: "Urgent", cls: "priority-urgent", icon: <IconUrgent /> },
  HIGH:   { label: "High",   cls: "priority-high",   icon: <IconHigh /> },
  MEDIUM: { label: "Medium", cls: "priority-medium",  icon: <IconMedium /> },
  LOW:    { label: "Low",    cls: "priority-low",    icon: <IconLow /> },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, cls, icon } = PRIORITY_MAP[priority] ?? PRIORITY_MAP.MEDIUM;
  return (
    <span className={`priority-chip ${cls}`}>
      {icon}
      {label}
    </span>
  );
}
