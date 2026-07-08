"use client";

import { useState, useRef, useEffect } from "react";
import type { TicketUser } from "@/types";

interface AssigneeSearchProps {
  agents: TicketUser[] | undefined;
  assignedToId: string | null;
  onChange: (newAssigneeId: string | null) => void;
  disabled?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function AssigneeSearch({
  agents,
  assignedToId,
  onChange,
  disabled,
}: AssigneeSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents?.find((a) => a.id === assignedToId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAgents = agents?.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "13px",
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedAgent ? (
            <>
              <span
                className="avatar w-5 h-5 text-white"
                style={{ background: "#6366f1", fontSize: "9px" }}
              >
                {getInitials(selectedAgent.name)}
              </span>
              <span className="truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>Unassigned</span>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base"
              style={{ padding: "6px 10px", fontSize: "12px" }}
            />
          </div>

          {/* Options */}
          <ul className="overflow-y-auto p-1" style={{ maxHeight: "200px" }}>
            <li
              className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors"
              style={{ color: "var(--text-muted)", fontSize: "13px" }}
              onClick={() => { onChange(null); setIsOpen(false); setSearchTerm(""); }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Unassigned
            </li>
            {filteredAgents?.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors"
                style={{
                  background: a.id === assignedToId ? "var(--brand-subtle)" : "transparent",
                  color: a.id === assignedToId ? "var(--brand)" : "var(--text-primary)",
                  fontSize: "13px",
                }}
                onClick={() => { onChange(a.id); setIsOpen(false); setSearchTerm(""); }}
                onMouseEnter={(e) => {
                  if (a.id !== assignedToId) (e.currentTarget as HTMLElement).style.background = "var(--surface-1)";
                }}
                onMouseLeave={(e) => {
                  if (a.id !== assignedToId) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span
                  className="avatar w-5 h-5 text-white"
                  style={{ background: "#6366f1", fontSize: "9px" }}
                >
                  {getInitials(a.name)}
                </span>
                {a.name}
              </li>
            ))}
            {filteredAgents?.length === 0 && (
              <li className="px-3 py-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                No agents found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
