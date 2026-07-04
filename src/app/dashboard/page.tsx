import { Suspense } from "react";
import { TicketsDashboard, CreateTicketForm } from "@/components/tickets";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <CreateTicketForm />
      <Suspense fallback={null}>
        <TicketsDashboard />
      </Suspense>
    </div>
  );
}
