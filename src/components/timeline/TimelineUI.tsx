"use client";

import React from "react";
import type { TicketMessage } from "@/types";

export interface TimelineUIProps {
  messages: TicketMessage[];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  SYSTEM: "#6366f1", // purple/indigo
  AGENT: "#0ea5e9", // blue
  CLIENT: "#10b981", // green
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const TimelineUI: React.FC<TimelineUIProps> = ({ messages }) => {
  return (
    <div className="mt-6 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Conversation
        </h3>
        {messages.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {messages.length}
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
            No messages in this thread yet.
          </p>
        ) : (
          messages.map((msg) => {
            const avatarBg = ROLE_COLORS[msg.senderType.toUpperCase()] ?? "#6366f1";
            return (
              <div
                key={msg.id}
                className="flex gap-3 group"
              >
                {/* Avatar */}
                <div
                  className="avatar w-7 h-7 text-white shrink-0 mt-0.5"
                  style={{ background: avatarBg, fontSize: "9px" }}
                >
                  {getInitials(msg.senderEmail)}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  <div
                    className="rounded-xl rounded-tl-sm px-4 py-3"
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-nowrap min-w-0">
                        <span className="text-xs font-semibold truncate min-w-0" style={{ color: "var(--text-primary)" }} title={msg.senderEmail}>
                          {msg.senderEmail}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0"
                          style={{ background: avatarBg + "22", color: avatarBg }}
                        >
                          {msg.senderType}
                        </span>
                        <span
                          className="text-[11px] shrink-0"
                          style={{ color: "var(--text-muted)" }}
                          title={new Date(msg.createdAt).toLocaleString()}
                        >
                          {relativeTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text-secondary)" }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
