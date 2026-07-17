import { NextRequest, NextResponse } from 'next/server';
import { google, gmail_v1 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { Priority, Role } from '@prisma/client';

const DOMAIN_TO_PROJECT_MAP: Record<string, string> = {
  "tmbank.in": "TMB",
  "tfsin.co.in": "TFSIN",
  "sib.bank.in": "SIB",
  "iob.bank.in": "IOB",
  "mahabank.co.in": "BOM",
  "bankofmaharashtra.bank.in": "BOM",
  "pronteff.com": "Pronteff",
  "bajajautocredit.com": "Bajaj Auto Credit",
  "bobcard.co.in": "BOBCARD",
  "indusind.com": "IndusInd",
  "odishabank.bank.in": "Odisha Bank",
  "janabank.com": "Jana Bank",
  "csb.bank.in": "CSB"
};

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = req.headers.get('authorization');
      const cronHeader = req.headers.get('x-vercel-cron');
      
      if (
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        cronHeader !== '1'
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    // We expect the refresh token in GMAIL_REFRESH_TOKEN or fallback to GOOGLE_REFRESH_TOKEN
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error("Missing Gmail refresh token in environment");
    }

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch projects
    const allProjects = await prisma.project.findMany();
    const otherProject = allProjects.find(p => p.name.toLowerCase() === 'other');
    if (!otherProject) {
      throw new Error("Fallback project 'Other' does not exist in the database. Please create it via Admin UI.");
    }

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -category:promotions -category:social -category:forums -from:me -from:google.com -from:github.com',
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({ processedCount: 0, newTickets: [] }, { status: 200 });
    }

    const processedTickets = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      
      const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const payload = fullMsg.data.payload;
      const headers = payload?.headers || [];

      let fromHeader = '';
      let subject = '(No Subject)';
      let autoSubmitted = false;
      let isNewsletter = false;

      for (const h of headers) {
        const name = h.name?.toLowerCase();
        if (name === 'from') fromHeader = h.value || '';
        if (name === 'subject') subject = h.value || '';
        if (name === 'auto-submitted' && h.value !== 'no') autoSubmitted = true;
        if (name === 'x-autoreply') autoSubmitted = true;
        if (name === 'list-unsubscribe' || name === 'list-id') isNewsletter = true;
      }

      const senderMatch = fromHeader.match(/(.*?)\s*<(.+?)>/);
      let senderName = fromHeader;
      let senderEmail = fromHeader;

      if (senderMatch && senderMatch[2]) {
        senderName = senderMatch[1]?.replace(/"/g, '').trim() || senderMatch[2].trim();
        senderEmail = senderMatch[2].replace(/[<>]/g, '').trim().toLowerCase();
      } else {
        senderEmail = senderEmail.replace(/[<>]/g, '').trim().toLowerCase();
        senderName = senderEmail;
      }

      const senderLower = (senderName + " " + senderEmail).toLowerCase();
      if (
        autoSubmitted ||
        isNewsletter ||
        senderLower.includes('noreply') ||
        senderLower.includes('no-reply') ||
        senderLower.includes('donotreply') ||
        senderLower.includes('mailer-daemon') ||
        senderLower.includes('notifications@') ||
        senderLower.includes('alert@') ||
        senderLower.includes('support@')
      ) {
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
        continue;
      }

      let rawBody = '';

      function extractBody(part: gmail_v1.Schema$MessagePart) {
        if (part.parts) {
          for (const p of part.parts) extractBody(p);
        } else if (part.body && part.body.data) {
          const decoded = Buffer.from(part.body.data, 'base64url').toString('utf-8');
          if (part.mimeType === 'text/plain') {
            rawBody += decoded + '\n';
          } else if (part.mimeType === 'text/html' && !rawBody) {
            // Strip HTML
            let clean = decoded.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            clean = clean.replace(/<[^>]+>/g, ' ');
            rawBody += clean + '\n';
          }
        }
      }

      if (payload) extractBody(payload);

      let cleanedBody = rawBody.trim();
      // Strip reply chains
      const replyTriggers = [/On\s+.*wrote:/i, /-----Original Message-----/i];
      for (const trigger of replyTriggers) {
        const idx = cleanedBody.search(trigger);
        if (idx !== -1) {
          cleanedBody = cleanedBody.substring(0, idx).trim();
        }
      }

      if (!cleanedBody) cleanedBody = '(No Content)';

      const searchContent = (subject + ' ' + cleanedBody).toLowerCase();
      let scoredPriority: Priority = Priority.P3;

      const p1Regex = /\b(urgent|critical|down|blocker|p1|sev1|asap)\b/;
      const p2Regex = /\b(error|broken|failing|high|issue|p2)\b/;
      const p4Regex = /\b(question|inquiry|info|request|minor|p4)\b/;

      if (p1Regex.test(searchContent)) {
        scoredPriority = Priority.P1;
      } else if (p2Regex.test(searchContent)) {
        scoredPriority = Priority.P2;
      } else if (p4Regex.test(searchContent)) {
        scoredPriority = Priority.P4;
      }

      let extractedDomain = '';
      if (senderEmail.includes('@')) {
        extractedDomain = senderEmail.split('@')[1].trim();
      }



      let mappedProjectName = DOMAIN_TO_PROJECT_MAP[extractedDomain];
      if (!mappedProjectName && extractedDomain) {
        for (const [domainKey, projName] of Object.entries(DOMAIN_TO_PROJECT_MAP)) {
          if (extractedDomain.endsWith(domainKey) || extractedDomain.includes(domainKey)) {
            mappedProjectName = projName;
            break;
          }
        }
      }

      let matchedProject = otherProject;

      if (mappedProjectName) {
        const normalizedMapName = mappedProjectName.toLowerCase().replace(/\s/g, '');
        const p = allProjects.find(pr => pr.name.toLowerCase().replace(/\s/g, '') === normalizedMapName);
        if (p) {
          matchedProject = p;
        } else {
          console.error(`[Routing Failure] Tried to match mapped project "${mappedProjectName}", but it does NOT exist in the database! Existing DB projects: ${allProjects.map(p => p.name).join(', ')}`);
        }
      } else if (extractedDomain) {
        // Substring match
        const found = allProjects.find(pr => extractedDomain.includes(pr.name.toLowerCase().replace(/\s/g, '')));
        if (found) {
          matchedProject = found;
        }
      }

      const user = await prisma.user.upsert({
        where: { email: senderEmail },
        update: { name: senderName },
        create: { email: senderEmail, name: senderName, role: Role.CUSTOMER }
      });

      const ticket = await prisma.ticket.create({
        data: {
          title: subject,
          description: cleanedBody,
          priority: scoredPriority,
          createdById: user.id,
          projectId: matchedProject.id,
          contactEmail: senderEmail
        }
      });

      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: { removeLabelIds: ['UNREAD'] }
      });

      processedTickets.push({
        ticketId: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        projectName: matchedProject.name
      });
    }

    return NextResponse.json({
      processedCount: processedTickets.length,
      newTickets: processedTickets
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Gmail Ingestion Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
