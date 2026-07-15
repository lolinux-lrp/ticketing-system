/**
 * Formats the elapsed time between two ISO timestamp strings as a human-readable duration.
 * Returns the two largest non-zero units, e.g. "2 days, 4 hours" or "45 minutes".
 */
export function formatResolutionTime(createdAt: string, resolvedAt: string): string {
  const totalSeconds = Math.floor(
    (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 1000,
  );

  if (totalSeconds < 60) return "< 1 minute";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0 && parts.length < 2) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return parts.join(", ");
}
