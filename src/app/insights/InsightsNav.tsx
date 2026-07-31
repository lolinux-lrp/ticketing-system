"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AgentSearch } from "@/components/insights/AgentSearch";

export function InsightsNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6 flex items-center justify-between">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/insights/global"
          className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
            pathname.startsWith("/insights/global")
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
        >
          Global Dashboard
        </Link>
        <Link
          href="/insights/personal"
          className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
            pathname.startsWith("/insights/personal")
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
        >
          My Performance
        </Link>
      </nav>
      {isAdmin && (
        <div className="py-2">
          <AgentSearch />
        </div>
      )}
    </div>
  );
}
