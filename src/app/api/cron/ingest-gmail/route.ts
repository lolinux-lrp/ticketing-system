import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { google, gmail_v1 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { Priority, Role, Prisma } from '@prisma/client';
import { EmailTemplates, buildMimeMessage } from '@/lib/email-templates';

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
    const allProjects = await prisma.project.findMany({
      include: { domains: true }
    });
    const otherProject = allProjects.find(p => p.name.toLowerCase() === 'other');
    if (!otherProject) {
      throw new Error("Fallback project 'Other' does not exist in the database. Please create it via Admin UI.");
    }

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -category:promotions -category:social -category:forums -from:me -from:google.com -from:github.com',
      maxResults: 50,
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

      let matchedProject = otherProject;

      if (extractedDomain) {
        const lowerExtractedDomain = extractedDomain.toLowerCase();
        const projectWithDomain = allProjects.find(p => 
          p.domains.some(d => {
            const lowerDbDomain = d.domain.toLowerCase();
            return lowerDbDomain === lowerExtractedDomain || lowerExtractedDomain.endsWith('.' + lowerDbDomain);
          })
        );

        if (projectWithDomain) {
          matchedProject = projectWithDomain;
        } else {
          // Substring match fallback against project name
          const domainLabels = lowerExtractedDomain.split('.');
          const found = allProjects.find(pr => {
            const normalizedName = pr.name.toLowerCase().replace(/\s/g, '');
            return normalizedName.length >= 4 && domainLabels.includes(normalizedName);
          });
          if (found) {
            matchedProject = found;
          }
        }
      }

      const user = await prisma.user.upsert({
        where: { email: senderEmail },
        update: { name: senderName },
        create: { email: senderEmail, name: senderName, role: Role.CUSTOMER }
      });

      if (matchedProject.contractEnd && new Date() > new Date(matchedProject.contractEnd)) {
        console.log(`[Ingest] Rejected ticket from User ID: ${user.id} - Project contract expired on ${matchedProject.contractEnd.toISOString()}`);
        
        if (msg.id) {
          let shouldProcess = false;
          let alreadySent = false;
          
          try {
            await prisma.processedMessage.create({
              data: { id: msg.id, status: 'PROCESSING', lockedAt: new Date() }
            });
            shouldProcess = true;
          } catch (dbErr: unknown) {
            if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === 'P2002') {
              const existing = await prisma.processedMessage.findUnique({ where: { id: msg.id } });
              if (existing) {
                if (existing.status === 'SENT') {
                  alreadySent = true;
                } else if (existing.status === 'PROCESSING') {
                  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
                  if (existing.lockedAt < fiveMinsAgo) {
                    const updated = await prisma.processedMessage.updateMany({
                      where: { id: msg.id, status: 'PROCESSING', lockedAt: existing.lockedAt },
                      data: { lockedAt: new Date() }
                    });
                    if (updated.count > 0) {
                      shouldProcess = true;
                    }
                  }
                }
              }
            } else {
              throw dbErr;
            }
          }
          
          if (shouldProcess) {
            try {
              const deterministicMessageId = `expiration-${msg.id}@ticketflow.local`;
              const existingMsgs = await gmail.users.messages.list({
                userId: 'me',
                q: `rfc822msgid:${deterministicMessageId}`
              });

              if (existingMsgs.data.messages && existingMsgs.data.messages.length > 0) {
                // Already delivered, reconcile state
                await prisma.processedMessage.update({
                  where: { id: msg.id },
                  data: { status: 'SENT' }
                });
                alreadySent = true;
              } else {
                const rendered = EmailTemplates.renderProjectExpiration({
                  projectName: matchedProject.name,
                  emailSubject: subject
                }, matchedProject.expirationSubject || undefined, matchedProject.expirationBody || undefined);

                const fromAddress = process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com";
                const encodedMessage = buildMimeMessage(senderEmail, `"TicketFlow" <${fromAddress}>`, rendered, { messageId: deterministicMessageId });

                await gmail.users.messages.send({
                  userId: 'me',
                  requestBody: { raw: encodedMessage }
                });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                await prisma.processedMessage.update({
                  where: { id: msg.id },
                  data: { status: 'SENT' }
                });
                alreadySent = true;
              }
            } catch (emailErr) {
              console.error(`[Ingest] Failed to send expiration email to User ID: ${user.id}: ${emailErr instanceof Error ? emailErr.message : "Unknown error"}`);
              continue; // Leave as PROCESSING so it can be retried later, skip UNREAD removal
            }
          }
          
          if (alreadySent) {
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: msg.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
              });
            } catch (err) {
              console.error("Failed to remove UNREAD label:", err instanceof Error ? err.message : err);
            }
          }
        }
        
        continue;
      }

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
    console.error(`Gmail Ingestion Error: ${err.message}`);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
