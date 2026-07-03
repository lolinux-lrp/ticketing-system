/**
 * Pulls the Zod/API error message out of an RTK Query rejected-mutation
 * error payload (shape: `{ status, data: { error: string } }`), falling
 * back to a generic message when the shape doesn't match.
 */
export function extractErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (
    err &&
    typeof err === "object" &&
    "data" in err &&
    err.data &&
    typeof err.data === "object" &&
    "error" in err.data
  ) {
    return String((err.data as { error: unknown }).error);
  }
  return fallback;
}
