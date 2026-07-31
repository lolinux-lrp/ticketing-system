import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import { FilterBar } from "@/components/insights/FilterBar";

export default async function PersonalInsightsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !("id" in session.user)) {
    redirect("/login");
  }

  const userId = session.user.id as string;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <FilterBar userId={userId} />
        <InsightsDashboard userId={userId} />
      </Suspense>
    </div>
  );
}
