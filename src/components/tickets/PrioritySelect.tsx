import type { Priority } from "@/types";

const PRIORITY_OPTIONS: Priority[] = ["P4", "P3", "P2", "P1"];

const PRIORITY_LABELS: Record<Priority, string> = {
  P4: "P4 (Low)",
  P3: "P3 (Medium)",
  P2: "P2 (High)",
  P1: "P1 (Critical)",
};

interface PrioritySelectProps {
  priority: Priority;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}

export function PrioritySelect({ priority, onChange, disabled }: PrioritySelectProps) {
  return (
    <select
      value={priority}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Priority)}
      className="input-base text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ padding: "6px 10px", fontSize: "13px" }}
    >
      {PRIORITY_OPTIONS.map((p) => (
        <option key={p} value={p}>
          {PRIORITY_LABELS[p]}
        </option>
      ))}
    </select>
  );
}
