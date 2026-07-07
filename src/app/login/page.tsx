"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Invalid email or password."); return; }
    router.push("/dashboard");
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage(""); setMagicLoading(true);
    const result = await signIn("email", { email, redirect: false });
    setMagicLoading(false);
    if (result?.error) { setError(result.error); return; }
    setMessage("Check your inbox for the magic link!");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, var(--surface-0) 70%)",
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Brand mark */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--brand)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect width="6" height="4" x="9" y="3" rx="1"/>
              <path d="M9 12h6"/><path d="M9 16h4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to TicketFlow
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handlePasswordSubmit} className="px-8 py-6 space-y-4">
          {error && (
            <div
              className="px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              className="px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              {message}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-base"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Password
              <span className="normal-case font-normal ml-1" style={{ color: "var(--text-muted)" }}>(optional for magic link)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLoading || !email}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {magicLoading ? "Sending..." : "Magic Link"}
            </button>
          </div>

          <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--brand)", fontWeight: 500 }}>
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}