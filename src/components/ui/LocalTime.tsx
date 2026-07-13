"use client";

import { useEffect, useState } from "react";

interface LocalTimeProps {
  date: string | Date;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
  className?: string;
}

export function LocalTime({ date, options, fallback = "...", className }: LocalTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [formatted, setFormatted] = useState(fallback);

  useEffect(() => {
    setMounted(true);
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const fmt = new Intl.DateTimeFormat("en-US", options);
      setFormatted(fmt.format(dateObj));
    } catch (e) {
      console.error("Error formatting date", e);
    }
  }, [date, options]);

  // To prevent hydration mismatch, we render the fallback on the server,
  // and the actual localized string on the client.
  return <span className={className}>{mounted ? formatted : fallback}</span>;
}
