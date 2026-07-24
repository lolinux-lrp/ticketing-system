import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { google } from "googleapis";
import { WatchOperationResult, GmailWatchResponse } from "@/types/gmail";
import { Role } from "@prisma/client";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Check CRON_SECRET first
  if (process.env.NODE_ENV !== "development") {
    const authHeader = req.headers.get("authorization") || "";
    
    if (process.env.CRON_SECRET) {
      const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
      const a = Buffer.from(authHeader, "utf8");
      const b = Buffer.from(expectedHeader, "utf8");
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }
  } else {
    // Development fallback
    const authHeader = req.headers.get("authorization") || "";
    if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
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

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("Missing Gmail refresh token in environment");
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function handleWatchRequest(req: NextRequest) {
  try {
    const authorized = await isAuthorized(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topicName = process.env.GOOGLE_PUBSUB_TOPIC;
    if (!topicName || !topicName.startsWith("projects/") || !topicName.includes("/topics/")) {
      console.error("[Watch] Invalid GOOGLE_PUBSUB_TOPIC configuration.");
      return NextResponse.json(
        { success: false, error: "Server missing valid GOOGLE_PUBSUB_TOPIC" } as WatchOperationResult,
        { status: 500 }
      );
    }

    const gmail = getGmailClient();
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName,
      },
    });

    const data = res.data as GmailWatchResponse;

    return NextResponse.json(
      {
        success: true,
        historyId: data.historyId,
        expiration: data.expiration,
      } as WatchOperationResult,
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Watch] Failed to initialize Gmail Watch:", message);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" } as WatchOperationResult,
      { status: 500 }
    );
  }
}

export const GET = handleWatchRequest;
export const POST = handleWatchRequest;
