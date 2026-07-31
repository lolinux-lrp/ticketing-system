import { ReactNode } from "react";
import { InsightsNav } from "./InsightsNav";

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full">
      <InsightsNav />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
