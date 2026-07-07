import { Suspense } from "react";
import { TicketsDashboard } from "@/components/tickets";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <TicketsDashboard />
    </Suspense>
  );
}
