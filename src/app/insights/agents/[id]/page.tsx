import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RouteParams } from "@/types/api";

export default async function AgentInsightsPage({ params }: RouteParams) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  // NextAuth Session User Role Check
  // Note: type casting or checking 'role' depending on how next-auth is extended.
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") {
    // Return a 403-like UI or redirect.
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 font-medium">
          403 Forbidden: You must be an administrator to view specific agent performance metrics.
        </div>
      </div>
    );
  }

  // Await params since Next.js 15+ sometimes requires params to be awaited if treated as Promise.
  // We'll safely destructure it.
  const { id } = await params;

  return (
    <div className="p-6">
      <div className="text-xl font-semibold text-[var(--text-primary)]">
        Agent {id} Dashboard Under Construction
      </div>
    </div>
  );
}
