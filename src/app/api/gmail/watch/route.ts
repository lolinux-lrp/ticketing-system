import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { registerGmailWatch } from "@/lib/gmail-watch";
import type { WatchOperationResult } from "@/types/gmail";
import { Role } from "@prisma/client";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET) {
    const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
    const a = Buffer.from(authHeader, "utf8");
    const b = Buffer.from(expectedHeader, "utf8");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  // Check Admin session
  const session = await getServerSession(authOptions);
  if (session?.user?.role === Role.ADMIN) {
    return true;
  }

  return false;
}

async function handleWatchRequest(req: NextRequest) {
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await registerGmailWatch();

  if (!result.success) {
    const isConfigError = result.error?.includes("GOOGLE_PUBSUB_TOPIC");
    return NextResponse.json(
      { success: false, error: result.error } as WatchOperationResult,
      { status: isConfigError ? 500 : 502 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      historyId: result.historyId,
      expiration: result.expiration,
    } as WatchOperationResult,
    { status: 200 }
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET) {
    const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
    const a = Buffer.from(authHeader, "utf8");
    const b = Buffer.from(expectedHeader, "utf8");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return handleWatchRequest(req);
    }
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const POST = handleWatchRequest;
