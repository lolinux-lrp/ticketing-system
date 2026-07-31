import { Suspense } from "react";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsDashboard />
    </Suspense>
  );
}
