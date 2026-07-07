import type { Status } from "@/types";

const STATUS_MAP: Record<
  Status,
  { label: string; cls: string; dotCls: string }
> = {
  OPEN: {
    label: "Open",
    cls: "status-open",
    dotCls: "",
  },
  IN_PROGRESS: {
    label: "In Progress",
    cls: "status-inprogress",
    dotCls: "",
  },
  RESOLVED: {
    label: "Resolved",
    cls: "status-resolved",
    dotCls: "",
  },
  CLOSED: {
    label: "Closed",
    cls: "status-closed",
    dotCls: "",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = STATUS_MAP[status] ?? STATUS_MAP.OPEN;
  return (
    <span className={`status-pill ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
