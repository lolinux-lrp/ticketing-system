/**
 * @file src/instrumentation.ts
 * @description Next.js server startup hook.
 *
 * Next.js calls `register()` once when the server process initializes —
 * before it begins serving any requests. This is the correct place for
 * one-time startup work such as renewing the Gmail watch subscription.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in the Node.js runtime (not the Edge runtime).
  // The Gmail API client requires Node.js built-ins (crypto, http2, etc.)
  // that are not available in the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Dynamically import to avoid bundling googleapis into the Edge runtime.
  const { registerGmailWatch } = await import("@/lib/gmail-watch");

  console.log("[startup] Registering Gmail watch subscription...");
  const result = await registerGmailWatch();

  if (result.success) {
    console.log(
      `[startup] Gmail watch active. Expires: ${new Date(Number(result.expiration)).toISOString()}`
    );
  } else {
    // Log the failure but do not throw — a failed watch registration
    // should not prevent the server from starting. The daily cron will
    // retry automatically.
    console.error(
      "[startup] Gmail watch registration failed on startup:",
      result.error
    );
  }
}
