import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
      style={{
        background: "var(--surface-0)",
      }}
    >
      {/* Gradient orbs */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-xl">
        {/* Logo mark */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: "var(--brand)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect width="6" height="4" x="9" y="3" rx="1"/>
            <path d="M9 12h6"/><path d="M9 16h4"/>
          </svg>
        </div>

        {/* Tagline badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
          style={{
            background: "var(--brand-subtle)",
            color: "var(--brand)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
          Enterprise Support Platform
        </div>

        {/* Headline */}
        <h1
          className="text-5xl font-bold tracking-tight leading-tight mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Resolve tickets at{" "}
          <span style={{ color: "var(--brand)" }}>lightning speed</span>
        </h1>

        {/* Sub */}
        <p
          className="text-lg leading-relaxed mb-8 max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          TicketFlow brings your team together — track, assign, and close support requests with the precision of a tool built for professionals.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/login"
            id="cta-login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{
              background: "var(--brand)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
            }}
          >
            Sign in to your workspace
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
          <Link
            href="/signup"
            id="cta-signup"
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Create a free account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 flex-wrap mt-10">
          {["Role-based access", "Real-time updates", "Priority queues", "Comment threads"].map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "var(--surface-1)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--brand)" }}>
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
