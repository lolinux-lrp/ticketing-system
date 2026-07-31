"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function InsightsNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6">
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
    </div>
  );
}
