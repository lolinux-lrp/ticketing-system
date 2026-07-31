import { Suspense } from "react";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import { FilterBar } from "@/components/insights/FilterBar";

export default function GlobalInsightsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <FilterBar />
        <InsightsDashboard />
      </Suspense>
    </div>
  );
}
