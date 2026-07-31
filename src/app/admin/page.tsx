"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useInviteUserMutation, useGetStandardUsersQuery, useDeactivateUserMutation, useReactivateUserMutation } from "@/store/usersApi";
import type { TicketUser } from "@/types";

export default function AdminPage() {
  const { data: session, status } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inviteUser, { isLoading }] = useInviteUserMutation();

  const [activeTab, setActiveTab] = useState<"active" | "deactivated">("active");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const delay = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(delay);
  }, [searchInput]);

  const { data: users, isLoading: isUsersLoading } = useGetStandardUsersQuery({
    search: searchTerm,
    status: activeTab,
  });

  const [deactivateUser] = useDeactivateUserMutation();
  const [reactivateUser] = useReactivateUserMutation();

  async function handleAction(userId: string, isReactivate: boolean) {
    const actionText = isReactivate ? "Reactivate this user? They will regain full access." : "Deactivate this user? They will immediately lose access.";
    if (confirm(actionText)) {
      try {
        if (isReactivate) {
          await reactivateUser(userId).unwrap();
        } else {
          await deactivateUser(userId).unwrap();
        }
      } catch (err) {
        const error = err as { data?: { error?: string } };
        alert(error?.data?.error || `Failed to ${isReactivate ? 'reactivate' : 'deactivate'} user.`);
      }
    }
  }

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
      setName(""); setEmail(""); setRole("USER");
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

      {/* Users & Access Management */}
      <div className="mb-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: "var(--surface-2)" }}>
            <button
              onClick={() => setActiveTab("active")}
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                background: activeTab === "active" ? "var(--surface-1)" : "transparent",
                color: activeTab === "active" ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: activeTab === "active" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Active Users
            </button>
            <button
              onClick={() => setActiveTab("deactivated")}
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                background: activeTab === "deactivated" ? "var(--surface-1)" : "transparent",
                color: activeTab === "deactivated" ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: activeTab === "deactivated" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Deactivated Users
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-base w-full sm:w-64"
          />
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          {isUsersLoading ? (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading users...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>No users found matching your criteria.</div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[350px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10" style={{ background: "var(--surface-1)" }}>
                  <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    <th className="py-3 font-medium">Name</th>
                    <th className="py-3 font-medium">Email</th>
                    <th className="py-3 font-medium">Role</th>
                    <th className="py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-secondary)" }}>
                  {users?.map((user: TicketUser) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                      <td className="py-3">{user.name || "N/A"}</td>
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">
                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {session?.user && (session.user as { id: string }).id === user.id ? (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Current User</span>
                        ) : activeTab === "active" ? (
                          <button
                            onClick={() => handleAction(user.id, false)}
                            className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                            style={{ background: "#ef4444" }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, true)}
                            className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                            style={{ background: "#22c55e" }}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              {(["USER", "ADMIN"] as const).map((r) => (
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
                  {r === "USER" ? "User" : "Admin"}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {role === "USER"
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