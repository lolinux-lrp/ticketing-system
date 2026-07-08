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
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Invalid email or password."); return; }
    router.push("/dashboard");
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
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-base"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : "Sign in"}
          </button>

          <div className="flex items-center justify-center space-x-2">
            <span className="h-px w-full" style={{ background: "var(--border)" }}></span>
            <span className="text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Or</span>
            <span className="h-px w-full" style={{ background: "var(--border)" }}></span>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
            style={{
              background: "var(--surface-0)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

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
