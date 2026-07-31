"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useGetStandardUsersQuery } from "@/store/usersApi";

export function AgentSearch() {
  const router = useRouter();
  const params = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users, isLoading, isError } = useGetStandardUsersQuery({ status: "ACTIVE" });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAgents = users?.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const currentAgentId = params.id as string;
  const currentAgent = users?.find(u => u.id === currentAgentId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setSelectedIndex(-1);
      return;
    }

    if (!filteredAgents || filteredAgents.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredAgents.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredAgents.length) {
        const agent = filteredAgents[selectedIndex];
        setIsOpen(false);
        setSearchTerm("");
        setSelectedIndex(-1);
        router.push(`/insights/agents/${agent.id}`);
      }
    }
  };

  return (
    <div className="relative w-64" ref={containerRef}>
      <div 
        className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 cursor-pointer hover:bg-[var(--surface-3)] transition-colors focus-within:ring-2 focus-within:ring-[var(--brand)]"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <Search className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1 text-left">
          {currentAgent ? currentAgent.name : "Search Agent..."}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 bg-[var(--surface-1)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              type="text"
              autoFocus
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="agent-listbox"
              aria-autocomplete="list"
              aria-activedescendant={selectedIndex >= 0 && filteredAgents ? `agent-option-${filteredAgents[selectedIndex].id}` : undefined}
              placeholder="Type to search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-sm outline-none focus:border-[var(--brand)] text-[var(--text-primary)]"
            />
          </div>
          
          <ul id="agent-listbox" className="max-h-60 overflow-y-auto p-1" role="listbox">
            {isLoading ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)] text-center">Loading...</li>
            ) : isError ? (
              <li className="px-3 py-2 text-sm text-red-500 text-center">Failed to load agents</li>
            ) : filteredAgents?.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)] text-center">No agents found</li>
            ) : (
              filteredAgents?.map((agent, index) => (
                <li
                  key={agent.id}
                  id={`agent-option-${agent.id}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors text-[var(--text-primary)] hover:bg-[var(--surface-2)] ${index === selectedIndex ? 'bg-[var(--surface-3)]' : ''}`}
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm("");
                    setSelectedIndex(-1);
                    router.push(`/insights/agents/${agent.id}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{agent.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{agent.role}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
