"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

interface LocalTimeProps {
  date: string | Date;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
  className?: string;
}

export function LocalTime({ date, options, fallback = "...", className }: LocalTimeProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  let formatted = fallback;
  if (isClient) {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const fmt = new Intl.DateTimeFormat("en-US", options);
      formatted = fmt.format(dateObj);
    } catch (e) {
      console.error("Error formatting date", e);
    }
  }

  return <span className={className}>{formatted}</span>;
}
