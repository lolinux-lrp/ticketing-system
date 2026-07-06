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
    return <div className="p-8 text-slate-400">Loading...</div>;
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="p-8 text-red-500">
        Unauthorized. You must be an Admin to access this page.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      await inviteUser({ name, email, role }).unwrap();
      setMessage({ type: "success", text: "Invite sent successfully! The user will receive an email with instructions." });
      setName("");
      setEmail("");
      setRole("AGENT");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.data?.error || "Failed to invite user. Please try again." });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold text-slate-50">Admin User Management</h1>
      
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-medium text-slate-200">Invite New Agent / Admin</h2>
        
        {message && (
          <div className={`mb-4 rounded p-3 text-sm font-medium ${message.type === "success" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="jane@company.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "AGENT" | "ADMIN")}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="AGENT">Agent (Can manage tickets)</option>
              <option value="ADMIN">Admin (Full access)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Sending Invite..." : "Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}