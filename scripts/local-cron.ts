// Load .env and .env.local before anything reads process.env.
// tsx does not auto-load env files the way Next.js does.
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true }); // .env.local takes precedence, same as Next.js

/**
 * @file scripts/local-cron.ts
 * @description Self-hosted cron runner.
 *
 * Run this as a separate process alongside the Next.js server:
 *
 *   pnpm cron:dev          (development)
 *   node scripts/cron.js   (production, after building)
 *
 * Or via PM2:
 *   pm2 start "pnpm cron:dev" --name ticketflow-cron
 *
 * Schedule mirrors vercel.json:
 *   - Meeting reminders   → every 1 minute  (/api/cron/reminders)
 *   - SLA escalation      → every 10 minutes (/api/cron/check-sla)
 *   - Gmail watch renewal → every 24 hours   (/api/gmail/watch)
 *
 * The Gmail watch is ALSO called on server startup via src/instrumentation.ts,
 * so this script only needs to handle the 24-hour renewal.
 */



// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";

const REMINDERS_INTERVAL_MS   = 1  * 60 * 1000;  //  1 minute
const SLA_INTERVAL_MS         = 10 * 60 * 1000;  // 10 minutes
const GMAIL_WATCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

interface PollResult {
  statusCode: number;
  body: string;
}

// Uses the global fetch (Node 18+) so it handles both http:// and https://
// automatically — no more socket hang-ups when APP_BASE_URL is HTTPS.
async function poll(path: string): Promise<PollResult> {
  const url = new URL(path, BASE_URL).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: controller.signal,
    });
    const body = await res.text();
    return { statusCode: res.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Individual job runners
// ---------------------------------------------------------------------------

async function runReminders() {
  try {
    const { statusCode, body } = await poll("/api/cron/reminders");
    if (statusCode === 200) {
      console.log(`[cron] reminders OK (${new Date().toLocaleTimeString()})`);
    } else {
      console.error(`[cron] reminders FAILED ${statusCode}:`, body.slice(0, 200));
    }
  } catch (err) {
    console.error("[cron] reminders ERROR:", (err as Error).message);
  }
}

async function runSlaCheck() {
  try {
    const { statusCode, body } = await poll("/api/cron/check-sla");
    if (statusCode === 200) {
      try {
        const parsed = JSON.parse(body) as { processedCount?: number };
        console.log(
          `[cron] check-sla OK — processed ${parsed.processedCount ?? "?"} tickets (${new Date().toLocaleTimeString()})`
        );
      } catch {
        console.log(`[cron] check-sla OK (${new Date().toLocaleTimeString()})`);
      }
    } else {
      console.error(`[cron] check-sla FAILED ${statusCode}:`, body.slice(0, 200));
    }
  } catch (err) {
    console.error("[cron] check-sla ERROR:", (err as Error).message);
  }
}

async function runGmailWatch() {
  try {
    const { statusCode, body } = await poll("/api/gmail/watch");
    if (statusCode === 200) {
      try {
        const parsed = JSON.parse(body) as { historyId?: string; expiration?: string };
        const expiresAt = parsed.expiration
          ? new Date(Number(parsed.expiration)).toISOString()
          : "unknown";
        console.log(`[cron] gmail/watch renewed — expires ${expiresAt}`);
      } catch {
        console.log("[cron] gmail/watch renewed OK");
      }
    } else {
      console.error(`[cron] gmail/watch FAILED ${statusCode}:`, body.slice(0, 200));
    }
  } catch (err) {
    console.error("[cron] gmail/watch ERROR:", (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Startup — wait for the server to be ready, then kick everything off
// ---------------------------------------------------------------------------

const STARTUP_DELAY_MS = 5000;

setTimeout(async () => {
  console.log("[cron] Starting all jobs...\n");

  // Run all jobs once immediately on startup
  await runReminders();
  await runSlaCheck();
  await runGmailWatch();

  // Then schedule them on their respective intervals
  setInterval(runReminders,   REMINDERS_INTERVAL_MS);
  setInterval(runSlaCheck,    SLA_INTERVAL_MS);
  setInterval(runGmailWatch,  GMAIL_WATCH_INTERVAL_MS);

  console.log("\n[cron] Schedules active:");
  console.log("  reminders   → every 1 minute");
  console.log("  check-sla   → every 10 minutes");
  console.log("  gmail/watch → every 24 hours");
}, STARTUP_DELAY_MS);

console.log(`[cron] Waiting ${STARTUP_DELAY_MS / 1000}s for server to be ready...`);
