import type { Status } from "@/types";

const STATUS_OPTIONS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_LABELS: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface StatusSelectProps {
  status: Status;
  onChange: (value: Status) => void;
  disabled?: boolean;
}

export function StatusSelect({ status, onChange, disabled }: StatusSelectProps) {
  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Status)}
      className="input-base text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ padding: "6px 10px", fontSize: "13px" }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
