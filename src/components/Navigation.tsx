"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
  );
}
function IconTickets() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/>
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconAccount() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS: Record<string, string> = {
  ADMIN: "#6366f1",
  AGENT: "#0ea5e9",
  CUSTOMER: "#10b981",
};

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
}
function NavItem({ href, label, icon, isActive }: NavItemProps) {
  return (
    <Link href={href} className={`nav-item ${isActive ? "active" : ""}`}>
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const { name = "", email = "", role = "" } = session.user as {
    name?: string;
    email?: string;
    role?: string;
  };
  const initials = getInitials(name || email || "U");
  const avatarBg = AVATAR_COLORS[role] ?? "#6366f1";

  return (
    <nav className="flex flex-col h-full" style={{ userSelect: "none" }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3 shrink-0"
        style={{ height: "var(--topbar-height)", borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--brand)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect width="6" height="4" x="9" y="3" rx="1"/>
            <path d="M9 12h6"/><path d="M9 16h4"/>
          </svg>
        </div>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          TicketFlow
        </span>
      </div>

      <div className="flex flex-col gap-0.5 p-2 flex-1">
        <p
          className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Workspace
        </p>

        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={<IconDashboard />}
          isActive={pathname === "/dashboard"}
        />
        <NavItem
          href="/dashboard"
          label="All Tickets"
          icon={<IconTickets />}
          isActive={false}
        />

        {role === "ADMIN" && (
          <>
            <p
              className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Admin
            </p>
            <NavItem
              href="/admin"
              label="User Management"
              icon={<IconAdmin />}
              isActive={pathname === "/admin"}
            />
          </>
        )}

        <p
          className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Account
        </p>
        <NavItem
          href="/account"
          label="Account Settings"
          icon={<IconAccount />}
          isActive={pathname === "/account"}
        />
      </div>

      <div
        className="p-3 shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <Link href="/account" className="flex items-center gap-2.5 p-2 rounded-lg transition-colors" style={{ background: "var(--surface-2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-2))")}>
          <div
            className="avatar w-7 h-7 text-white shrink-0"
            style={{ background: avatarBg, fontSize: "10px" }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold truncate leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {name || "User"}
            </p>
            <p
              className="text-[10px] truncate leading-tight mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {email}
            </p>
          </div>

          <button
            onClick={(e) => { e.preventDefault(); signOut({ callbackUrl: "/login" }); }}
            title="Sign out"
            className="shrink-0 p-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              (e.currentTarget as HTMLElement).style.background = "var(--surface-0)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <IconSignOut />
          </button>
        </Link>

        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {role}
        </p>
      </div>
    </nav>
  );
}

export { Sidebar as Navigation };
