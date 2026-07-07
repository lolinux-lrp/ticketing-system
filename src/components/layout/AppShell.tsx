"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Navigation";
import { TopBar } from "./TopBar";
import { CreateTicketSlideOver } from "@/components/tickets/CreateTicketForm";

// Routes that should render WITHOUT the sidebar shell
const SHELL_EXCLUDED = ["/", "/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showShell =
    status !== "loading" &&
    !!session &&
    !SHELL_EXCLUDED.includes(pathname);

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <div
        className="sidebar-area border-r"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        <Sidebar />
      </div>

      {/* Right workspace: topbar + scrollable content */}
      <div className="workspace-area">
        <TopBar onOpenCreate={() => setIsCreateOpen(true)} />

        <div className="workspace-scroll">
          {children}
        </div>
      </div>

      {/* Global slide-over for new ticket creation */}
      <CreateTicketSlideOver
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
