"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardCalendar } from "@/components/meetings/DashboardCalendar";

export default function SchedulePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-48 rounded" style={{ background: "var(--surface-2)" }} />
        <div className="h-32 rounded-xl mt-8" style={{ background: "var(--surface-1)" }} />
        <div className="h-32 rounded-xl" style={{ background: "var(--surface-1)" }} />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            My Schedule
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage your upcoming meetings and Google Meet rooms.
          </p>
        </div>
      </div>
      
      <DashboardCalendar />
    </div>
  );
}
