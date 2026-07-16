"use client";

import { useState, useRef, useEffect } from "react";
import type { TicketUser } from "@/types";

interface AssignedToFilterProps {
  users: TicketUser[];
  currentUserId: string;
  role: "ADMIN" | "AGENT" | "CUSTOMER";
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
}

export function AssignedToFilter({ users, currentUserId, role, value, onChange }: AssignedToFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (role !== "ADMIN") {
    const isMine = value === currentUserId;
    return (
      <button
        type="button"
        onClick={() => onChange(isMine ? undefined : currentUserId)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer select-none"
        style={{
          background: isMine ? "var(--brand-subtle)" : "var(--surface-2)",
          color: isMine ? "var(--brand)" : "var(--text-secondary)",
          border: `1px solid ${isMine ? "var(--brand)" : "var(--border)"}`,
        }}
      >
        Assigned to Me
        {isMine && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </button>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedUser = value ? users.find(u => u.id === value) : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer select-none"
        style={{
          background: value ? "var(--brand-subtle)" : "var(--surface-2)",
          color: value ? "var(--brand)" : "var(--text-secondary)",
          border: `1px solid ${value ? "var(--brand)" : "var(--border)"}`,
        }}
      >
        {selectedUser ? selectedUser.name : "Assignee"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-56 rounded-md shadow-lg py-1 border overflow-hidden"
          style={{ background: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <div className="px-2 py-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full text-xs px-2 py-1.5 rounded outline-none"
              style={{ background: "var(--surface-1)", color: "var(--text-primary)" }}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] transition-colors"
              style={{ color: !value ? "var(--brand)" : "var(--text-primary)" }}
            >
              All Assigned Users
            </button>
            {filteredUsers.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onChange(user.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: value === user.id ? "var(--brand)" : "var(--text-primary)" }}
              >
                <div className="font-medium truncate">{user.name}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{user.email}</div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-3 py-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
                No users found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
