import { NextRequest, NextResponse } from "next/server";
import { PubSubPushPayload, PubSubDecodedData } from "@/types/gmail";
import { processIncomingEmails } from "@/services/email-ingestion.service";
import { after } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PubSubPushPayload;

    if (!body?.message?.data) {
      return new NextResponse("Bad Request: Missing data", { status: 400 });
    }

    const decodedStr = Buffer.from(body.message.data, "base64").toString("utf-8");
    const data = JSON.parse(decodedStr) as PubSubDecodedData;

    if (!data.historyId || !data.emailAddress) {
      return new NextResponse("Bad Request: Invalid payload", { status: 400 });
    }

    // Next.js 15+ after() ensures background execution completes without blocking the response
    if (typeof after === "function") {
      after(() => {
        processIncomingEmails(data.historyId).catch((err: unknown) => {
          console.error(
            "Webhook background processing error:",
            err instanceof Error ? err.message : "Unknown error"
          );
        });
      });
    } else {
      // Fallback for environments without next/server after()
      void processIncomingEmails(data.historyId).catch((err: unknown) => {
        console.error(
          "Webhook background processing error:",
          err instanceof Error ? err.message : "Unknown error"
        );
      });
    }

    // Instant 200 response to satisfy Google Cloud Pub/Sub's 10-second timeout
    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    console.error(
      "Webhook payload decoding error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
