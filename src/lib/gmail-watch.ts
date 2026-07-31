/**
 * @file src/lib/gmail-watch.ts
 * @description Core Gmail Push Notification watch registration logic.
 *
 * Extracted from the API route so it can be called from both
 * the HTTP handler (/api/gmail/watch) and the server startup
 * instrumentation hook (src/instrumentation.ts) without duplication.
 */

import { google } from "googleapis";

export interface WatchResult {
  success: boolean;
  historyId?: string;
  expiration?: string;
  error?: string;
}

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const refreshToken =
    process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("[gmail-watch] Missing Gmail refresh token in environment");
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Registers (or renews) a Gmail Push Notification watch subscription.
 *
 * Gmail watch subscriptions expire after ~7 days. Call this on server
 * startup and on a daily cron schedule to ensure continuous coverage.
 *
 * @returns A `WatchResult` describing the outcome. Never throws — all
 *          errors are caught and reflected in `result.success === false`.
 */
export async function registerGmailWatch(): Promise<WatchResult> {
  const topicName = process.env.GOOGLE_PUBSUB_TOPIC;

  if (
    !topicName ||
    !topicName.startsWith("projects/") ||
    !topicName.includes("/topics/")
  ) {
    const msg = "Invalid or missing GOOGLE_PUBSUB_TOPIC environment variable";
    console.error("[gmail-watch]", msg);
    return { success: false, error: msg };
  }

  try {
    const gmail = getGmailClient();
    const res = await gmail.users.watch(
      {
        userId: "me",
        requestBody: {
          labelIds: ["INBOX"],
          topicName,
        },
      },
      { timeout: 10000 }
    );

    const { historyId, expiration } = res.data;

    if (!historyId || !expiration) {
      const msg = "Gmail API returned a response with missing historyId or expiration";
      console.error("[gmail-watch]", msg, res.data);
      return { success: false, error: msg };
    }

    const expiresAt = new Date(Number(expiration)).toISOString();
    console.log(
      `[gmail-watch] Watch registered successfully. historyId=${historyId}, expires=${expiresAt}`
    );

    return {
      success: true,
      historyId: String(historyId),
      expiration: String(expiration),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[gmail-watch] Failed to register Gmail watch:", message);
    return { success: false, error: message };
  }
}
