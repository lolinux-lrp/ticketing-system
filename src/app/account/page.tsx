"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const { user } = session;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold text-slate-50">My Account</h1>

      {/* Account Details */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <h2 className="mb-6 text-lg font-medium text-slate-200">Account Details</h2>

        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Name</span>
            <span className="mt-1 block text-base text-slate-100">{user.name || "N/A"}</span>
          </div>

          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Email Address</span>
            <span className="mt-1 block text-base text-slate-100">{user.email}</span>
          </div>

          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Role</span>
            <span className="mt-1 inline-block rounded bg-blue-900/40 px-2.5 py-0.5 text-sm font-semibold text-blue-400">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Security / Password */}
      <ChangePasswordSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/change-password")
      .then((r) => r.json())
      .then((d) => setHasPassword(!!d.hasPassword))
      .catch(() => setHasPassword(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setMessage(hasPassword ? "Password changed successfully." : "Password set successfully.");
        setHasPassword(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
      <h2 className="mb-1 text-lg font-medium text-slate-200">Security</h2>
      <p className="mb-6 text-xs text-slate-500">
        {hasPassword === null
          ? "Loading..."
          : hasPassword
          ? "Update your existing password."
          : "You signed in with Google and don't have a password yet. Set one to also enable email login."}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-md border border-green-900/50 bg-green-900/20 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {hasPassword === null ? null : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter current password"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Repeat new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : hasPassword
              ? "Change Password"
              : "Set Password"}
          </button>
        </form>
      )}
    </div>
  );
}
