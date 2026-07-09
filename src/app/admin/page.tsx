"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useInviteUserMutation } from "@/store/usersApi";

export default function AdminPage() {
  const { data: session, status } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"AGENT" | "ADMIN">("AGENT");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inviteUser, { isLoading }] = useInviteUserMutation();

  if (status === "loading") {
    return (
      <div className="p-8 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return (
      <div
        className="m-8 p-4 rounded-xl text-sm font-medium"
        style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        Unauthorized. You must be an Admin to access this page.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await inviteUser({ name, email, role }).unwrap();
      const text = (res as { message?: string }).message ?? "Invite sent! The user will receive an email with login instructions.";
      setMessage({ type: "success", text });
      setName(""); setEmail(""); setRole("AGENT");
    } catch (err) {
      setMessage({ type: "error", text: (err as { data?: { error?: string } })?.data?.error || "Failed to invite user. Please try again." });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          User Management
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Invite new agents and administrators to your workspace.
        </p>
      </div>

      {/* Invite card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
        }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Send an invite
        </h3>

        {message && (
          <div
            className="mb-4 px-3 py-2.5 rounded-lg text-sm font-medium"
            style={
              message.type === "success"
                ? { background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }
                : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
            }
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-name" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Full name
            </label>
            <input
              id="admin-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="jane@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Role
            </label>
            <div className="flex gap-2">
              {(["AGENT", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: role === r ? "var(--brand)" : "var(--surface-2)",
                    color: role === r ? "white" : "var(--text-secondary)",
                    border: `1px solid ${role === r ? "var(--brand)" : "var(--border)"}`,
                  }}
                >
                  {r === "AGENT" ? "Agent" : "Admin"}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {role === "AGENT"
                ? "Agents can manage and respond to tickets."
                : "Admins have full access including user management."}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending invite...
              </span>
            ) : "Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}