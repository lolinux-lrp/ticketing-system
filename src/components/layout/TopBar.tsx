"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "All Tickets",
  "/admin": "Admin — User Management",
  "/account": "Account Settings",
};

function getTitle(pathname: string) {
  if (pathname.startsWith("/tickets/")) return "Ticket Detail";
  return PAGE_TITLES[pathname] ?? "TicketFlow";
}

interface TopBarProps {
  onOpenCreate: () => void;
}

export function TopBar({ onOpenCreate }: TopBarProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header
      className="flex items-center justify-between gap-4 px-5 shrink-0"
      style={{
        height: "var(--topbar-height)",
        backgroundColor: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Page title */}
      <h1
        className="text-sm font-semibold truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h1>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />

        <button
          id="create-ticket-btn"
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 active:scale-95"
          style={{
            background: "var(--brand)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--brand-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--brand)")
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Ticket
        </button>
      </div>
    </header>
  );
}
