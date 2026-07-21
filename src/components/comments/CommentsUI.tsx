"use client";

import React, { useState } from "react";

export interface CommentUIItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

export interface CommentsUIProps {
  comments: CommentUIItem[];
  isLoading: boolean;
  currentUserId: string;
  isSubmitting: boolean;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#6366f1",
  AGENT: "#0ea5e9",
  CUSTOMER: "#10b981",
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

export const CommentsUI: React.FC<CommentsUIProps> = ({
  comments,
  isLoading,
  currentUserId,
  isSubmitting,
  onAddComment,
  onDeleteComment,
}) => {
  const [newComment, setNewComment] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteComment(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 mt-6">
        <div className="h-4 w-40 rounded" style={{ background: "var(--surface-2)" }} />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl flex gap-3"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "var(--surface-2)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/4 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-3 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-3 w-5/6 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Activity
        </h3>
        {comments.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
            No comments yet. Start the conversation below.
          </p>
        ) : (
          comments.map((comment) => {
            const avatarBg = ROLE_COLORS[comment.author.role.toUpperCase()] ?? "#6366f1";
            return (
              <div
                key={comment.id}
                className="flex gap-3 group"
              >
                {/* Avatar */}
                <div
                  className="avatar w-7 h-7 text-white shrink-0 mt-0.5"
                  style={{ background: avatarBg, fontSize: "9px" }}
                >
                  {getInitials(comment.author.name)}
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
                        <span className="text-xs font-semibold truncate min-w-0" style={{ color: "var(--text-primary)" }} title={comment.author.name}>
                          {comment.author.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0"
                          style={{ background: avatarBg + "22", color: avatarBg }}
                        >
                          {comment.author.role}
                        </span>
                        <span
                          className="text-[11px] shrink-0"
                          style={{ color: "var(--text-muted)" }}
                          title={new Date(comment.createdAt).toLocaleString()}
                        >
                          {relativeTime(comment.createdAt)}
                        </span>
                      </div>

                      {/* Delete */}
                      {comment.author.id === currentUserId && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-6 h-6 rounded-md transition-all disabled:opacity-50 shrink-0"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#ef4444";
                            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                          aria-label="Delete comment"
                        >
                          {deletingId === comment.id ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text-secondary)" }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose area */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl p-3 mt-4"
        style={{
          background: "var(--surface-1)",
          border: `1px solid ${focused ? "var(--brand)" : "var(--border)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        <textarea
          id="comment"
          rows={3}
          className="block w-full text-sm bg-transparent outline-none resize-none"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={isSubmitting}
          style={{ color: "var(--text-primary)" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Markdown supported
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand)" }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
                Comment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
