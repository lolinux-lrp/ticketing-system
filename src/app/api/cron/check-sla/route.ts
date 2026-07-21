import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { EmailTemplates, buildMimeMessage } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

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
    
    // Auth Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error("Missing Gmail refresh token in environment");
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const fromAddress = process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com";
    const execEscalationEmail = process.env.EXEC_ESCALATION_EMAIL;
    const excludedEmails = (process.env.SLA_EXCLUDED_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);

    // SLA Evaluation Logic
    const openTickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      },
      include: {
        assignedTo: true,
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' }
      ],
      take: 50
    });

    // Get admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true }
    });
    
    const adminEmails = admins.map(a => a.email).filter(e => e && !excludedEmails.includes(e)) as string[];
    let processedCount = 0;

    const now = new Date();

    for (const ticket of openTickets) {
      try {
        const createdHrs = (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        let thresholdHrs = 4;
        if (ticket.priority === 'P1') thresholdHrs = 1;
        if (ticket.priority === 'P2') thresholdHrs = 2;

        // Level 1: Admin Escalation
        if (createdHrs > thresholdHrs && !ticket.adminEscalatedAt) {
          if (adminEmails.length > 0) {
            const rendered = EmailTemplates.renderSLAAdminWarning({
              ticketId: ticket.id,
              title: ticket.title,
              priority: ticket.priority,
              hoursOpen: createdHrs.toFixed(1)
            });
            const encodedMessage = buildMimeMessage("undisclosed-recipients:;", `"TicketFlow SLA" <${fromAddress}>`, rendered, { bcc: adminEmails.join(', ') });
            await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { adminEscalatedAt: new Date() }
            });
            processedCount++;
          }
        } 
        // Level 2: Executive Escalation
        else if (ticket.adminEscalatedAt && !ticket.execEscalatedAt) {
          const hoursSinceAdmin = (now.getTime() - ticket.adminEscalatedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceAdmin > 2) {
            if (execEscalationEmail) {
              const rendered = EmailTemplates.renderSLAExecEscalation({
                ticketId: ticket.id,
                title: ticket.title,
                priority: ticket.priority,
                hoursOpen: createdHrs.toFixed(1)
              });
              const encodedMessage = buildMimeMessage(execEscalationEmail, `"TicketFlow Exec Alerts" <${fromAddress}>`, rendered);
              await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await prisma.ticket.update({
                where: { id: ticket.id },
                data: { execEscalatedAt: new Date() }
              });
              processedCount++;
            }
          }
        }
      } catch (err) {
        console.error(`Error processing SLA for ticket ${ticket.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({ processedCount }, { status: 200 });
  } catch (error) {
    console.error(`Error in SLA engine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
