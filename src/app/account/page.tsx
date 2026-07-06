"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const { user } = session;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold text-slate-50">My Account</h1>
      
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <h2 className="mb-6 text-lg font-medium text-slate-200">Account Details</h2>
        
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Name</span>
            <span className="mt-1 block text-base text-slate-100">{user.name || "N/A"}</span>
          </div>

          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Email Address</span>
            <span className="mt-1 block text-base text-slate-100">{user.email}</span>
          </div>

          <div>
            <span className="block text-xs font-medium uppercase text-slate-500">Role</span>
            <span className="mt-1 inline-block rounded bg-blue-900/40 px-2.5 py-0.5 text-sm font-semibold text-blue-400">
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
