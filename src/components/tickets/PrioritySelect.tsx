import type { Priority } from "@/types";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
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
