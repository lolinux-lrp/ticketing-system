import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processIncomingEmails } from '@/services/email-ingestion.service';

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = req.headers.get('authorization') || '';
      
      if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let isCronSecretValid = false;
      try {
        const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
        const a = Buffer.from(authHeader, 'utf8');
        const b = Buffer.from(expectedHeader, 'utf8');
        if (a.length === b.length) {
          isCronSecretValid = crypto.timingSafeEqual(a, b);
        }
      } catch {
        // Safe to ignore, validation remains false
      }
      
      if (!isCronSecretValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Call our new centralized ingestion service without a history ID (Full query)
    const result = await processIncomingEmails();

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Gmail Ingestion Error: ${err.message}`);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
