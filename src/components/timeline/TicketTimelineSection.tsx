"use client";

import React from "react";
import { TimelineUI } from "./TimelineUI";
import type { TicketMessage } from "@/types";

interface TicketTimelineSectionProps {
  messages: TicketMessage[];
}

export const TicketTimelineSection: React.FC<TicketTimelineSectionProps> = ({ messages }) => {
  return (
    <TimelineUI messages={messages} />
  );
};
