"use client";

import { useState, useRef, useEffect } from "react";
import type { TicketUser } from "@/types";

interface AssigneeSearchProps {
  agents: TicketUser[] | undefined;
  assignedToId: string | null;
  onChange: (newAssigneeId: string | null) => void;
  disabled?: boolean;
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    <div className="relative w-48" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center border rounded px-3 py-1.5 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <span className="truncate text-gray-700">
          {selectedAgent ? selectedAgent.name : "Unassigned"}
        </span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b">
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="overflow-y-auto flex-1 p-1">
            <li
              className="px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer rounded"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            >
              Unassigned
            </li>
            {filteredAgents?.map((a) => (
              <li
                key={a.id}
                className={`px-2 py-1.5 text-sm cursor-pointer rounded ${
                  a.id === assignedToId
                    ? "bg-blue-100 text-blue-800 font-medium"
                    : "text-gray-700 hover:bg-blue-50"
                }`}
                onClick={() => {
                  onChange(a.id);
                  setIsOpen(false);
                }}
              >
                {a.name}
              </li>
            ))}
            {filteredAgents?.length === 0 && (
              <li className="px-2 py-2 text-sm text-gray-400 italic text-center">
                No matches
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
