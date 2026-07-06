"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navigation() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950 px-8 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-50">
            Ticketing System
          </Link>
          {session.user.role === "ADMIN" && (
            <Link href="/admin" className="text-sm font-medium text-slate-300 hover:text-white">
              Admin
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/account" className="text-sm font-medium text-slate-300 hover:text-white">
            {session.user.email} <span className="ml-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{session.user.role}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
