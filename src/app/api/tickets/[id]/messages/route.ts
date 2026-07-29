import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { RouteParams } from "@/types/api";
import { z } from "zod";
import { TicketMessageSenderType, Status } from "@prisma/client";
import { sendTicketReplyEmail } from "@/lib/email";
import { revalidatePath, revalidateTag } from "next/cache";
import { broadcastTicketMutation } from "@/lib/realtime/emitter";

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
        assignedTo: true,
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

    const extraCcList = cc ? cc.split(",").map(e => e.trim().toLowerCase()).filter(Boolean) : [];
    
    // The ticket.ccEmails should store the requested CCs for future correspondence, not every replying agent.
    const updatedCcEmails = Array.from(new Set([...(ticket.ccEmails || []), ...extraCcList]));

    const mailerCcList = [...extraCcList];
    // Add acting agent email so they get cc'd on replies for this specific message
    if (senderType === TicketMessageSenderType.AGENT && senderEmail !== "unknown@example.com") {
      mailerCcList.push(senderEmail.toLowerCase());
    }
    const finalMessageCc = mailerCcList.length > 0 ? Array.from(new Set(mailerCcList)).join(", ") : null;

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
          cc: finalMessageCc,
          bcc,
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          lastActivityAt: new Date(),
          ccEmails: updatedCcEmails,
          ...(newStatus ? { status: newStatus } : {}),
          ...(resolvedAt !== undefined ? { resolvedAt } : {}),
        },
      }),
    ]);

    // Send email if `to` is provided
    if (to) {
      let htmlQuoteBlock = "";
      if (ticket.messages.length > 0) {
        htmlQuoteBlock = `<br/><br/><hr/><div>Please reply above this line</div><hr/><br/>` + 
          ticket.messages.map(msg => {
            const dateStr = msg.createdAt.toLocaleString("en-US", {
              weekday: "short", month: "short", day: "numeric",
              year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"
            });
            const escapedContent = msg.content
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;")
              .replace(/\n/g, '<br/>');
            return `<div>On ${dateStr}, ${msg.senderEmail} (${msg.senderType}) wrote:<br/><blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">${escapedContent}</blockquote></div><br/>`;
          }).join('');
      }

      let info;
      try {
        const agentName = session.user.name || session.user.email || "Support Team";
        
        info = await sendTicketReplyEmail({
          ticket,
          messageContent: content,
          senderName: senderType === TicketMessageSenderType.AGENT ? agentName : senderEmail,
          htmlQuoteBlock,
          additionalCc: mailerCcList,
        });
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

      if (info.messageId) {
        await prisma.ticketMessage.update({
          where: { id: transaction[0].id },
          data: { messageId: info.messageId }
        });
        transaction[0].messageId = info.messageId;
      }
      
      if (info.threadId && !ticket.threadId) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { threadId: info.threadId }
        });
      }
    }

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
    // @ts-expect-error Next.js canary type bug
    revalidateTag("tickets");
    // @ts-expect-error Next.js canary type bug
    revalidateTag(`ticket-${ticketId}`);

    broadcastTicketMutation(ticketId, "MESSAGE_ADDED");

    return NextResponse.json(transaction[0], { status: 200 });
  } catch (e) {
    console.error("Error creating TicketMessage: ", e);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }
}
