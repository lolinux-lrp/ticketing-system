import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { RouteParams } from "@/types/api";
import { z } from "zod";
import { TicketMessageSenderType, Status } from "@prisma/client";
import { google } from "googleapis";
import { buildMimeMessage } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  newStatus: z.nativeEnum(Status).optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await req.json();
    const validation = createMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { content, to, cc, bcc, newStatus } = validation.data;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        messages: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (session.user.role !== "AGENT" && session.user.role !== "ADMIN" && ticket.createdById !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role === "CUSTOMER" && (to || cc || bcc || newStatus)) {
       return NextResponse.json({ error: "Forbidden: Only agents can specify external recipients or update status" }, { status: 403 });
    }

    const senderType =
      session.user.role === "AGENT" || session.user.role === "ADMIN"
        ? TicketMessageSenderType.AGENT
        : TicketMessageSenderType.CLIENT;

    const senderEmail = session.user.email || "unknown@example.com";

    let finalCcList = cc ? cc.split(",").map(e => e.trim().toLowerCase()).filter(Boolean) : [];
    
    // Add DB ccEmails
    if (ticket.ccEmails && Array.isArray(ticket.ccEmails)) {
      finalCcList.push(...ticket.ccEmails.map(e => e.toLowerCase()));
    }

    // Add acting agent email
    if (senderType === TicketMessageSenderType.AGENT && senderEmail !== "unknown@example.com") {
      finalCcList.push(senderEmail.toLowerCase());
    }

    // Deduplicate and filter
    const systemEmail = (process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com").toLowerCase();
    const creatorEmail = ticket.createdBy?.email?.toLowerCase() || ticket.contactEmail?.toLowerCase() || "";

    finalCcList = Array.from(new Set(finalCcList)).filter(e => {
      const lower = e.toLowerCase();
      return lower !== creatorEmail && lower !== systemEmail && !lower.includes("support@");
    });
    
    const finalCc = finalCcList.join(", ");

    const lastMessage = ticket.messages[0];
    const inReplyTo = lastMessage?.messageId || undefined;

    let quotedHistoryBlock = "";
    if (ticket.messages.length > 0) {
      quotedHistoryBlock += "\n\n--- Please reply above this line ---\n\n";
      for (const msg of ticket.messages) {
        const dateStr = msg.createdAt.toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"
        });
        quotedHistoryBlock += `On ${dateStr}, ${msg.senderEmail} (${msg.senderType}) wrote:\n>${msg.content.replace(/\n/g, '\n> ')}\n\n`;
      }
    }

    const resolvedAt =
      newStatus === "RESOLVED"
        ? new Date()
        : newStatus === "OPEN" || newStatus === "IN_PROGRESS"
        ? null
        : undefined;

    const transaction = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId,
          content,
          senderType,
          senderEmail,
          to,
          cc: finalCc || null,
          bcc,
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          lastActivityAt: new Date(),
          ccEmails: finalCcList,
          ...(newStatus ? { status: newStatus } : {}),
          ...(resolvedAt !== undefined ? { resolvedAt } : {}),
        },
      }),
    ]);

    // Send email if `to` is provided
    if (to) {
      let attributionSignature = "";
      let htmlAttributionSignature = "";
      if (senderType === TicketMessageSenderType.AGENT) {
        const agentName = session.user.name || session.user.email;
        attributionSignature = `\n\n---\nBest regards,\n${agentName}\nSupport Team`;
        htmlAttributionSignature = `<br/><br/>---<br/>Best regards,<br/>${agentName}<br/>Support Team`;
      }

      const fullText = content + attributionSignature + quotedHistoryBlock;
      // Basic translation of the quote block to HTML, maintaining the blockquotes
      const htmlQuoteBlock = quotedHistoryBlock.length > 0 
        ? `<br/><br/><hr/><div>Please reply above this line</div><hr/><br/>` + 
          ticket.messages.map(msg => {
            const dateStr = msg.createdAt.toLocaleString("en-US", {
              weekday: "short", month: "short", day: "numeric",
              year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"
            });
            return `<div>On ${dateStr}, ${msg.senderEmail} (${msg.senderType}) wrote:<br/><blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">${msg.content.replace(/\n/g, '<br/>')}</blockquote></div><br/>`;
          }).join('')
        : "";

      const renderedEmail = {
        subject: ticket.title.toLowerCase().startsWith('re:') ? ticket.title : `Re: ${ticket.title}`,
        html: `<p>${content.replace(/\n/g, "<br/>")}</p>${htmlAttributionSignature}${htmlQuoteBlock}`,
        plainText: fullText,
      };

      const from = process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@example.com";

      const rawMessage = buildMimeMessage(to, from, renderedEmail, {
        messageId: undefined, // We don't generate messageId, Google will
        cc: finalCc || undefined,
        bcc,
        inReplyTo,
        references: inReplyTo,
      });

      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        const refreshToken =
          process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  
        const res = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: rawMessage,
            threadId: ticket.threadId || undefined,
          },
        });
        
        await prisma.ticketMessage.update({
          where: { id: transaction[0].id },
          data: { messageId: res.data.id || undefined }
        });
        
        transaction[0].messageId = res.data.id || null;
      } catch (err) {
        // Rollback the DB transaction if email fails so it can be retried cleanly
        await prisma.$transaction([
          prisma.ticketMessage.delete({ where: { id: transaction[0].id } }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: {
              lastActivityAt: ticket.lastActivityAt,
              ccEmails: ticket.ccEmails,
              status: ticket.status,
              resolvedAt: ticket.resolvedAt,
            },
          }),
        ]);
        throw err;
      }
    }

    return NextResponse.json(transaction[0], { status: 200 });
  } catch (e) {
    console.error("Error creating TicketMessage: ", e);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }
}
