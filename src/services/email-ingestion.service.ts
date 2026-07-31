import { google, gmail_v1 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { Priority, Role, Prisma } from "@prisma/client";
import { EmailTemplates, buildMimeMessage, escapeHtml } from "@/lib/email-templates";
import { sendTicketReplyEmail } from "@/lib/email";
import { sendNewTicketNotification } from "@/lib/email";
import { revalidatePath, revalidateTag } from "next/cache";
import { broadcastTicketCreated, broadcastTicketMutation } from "@/lib/realtime/emitter";
import { trimIncomingEmail } from "@/lib/email-trimmer";
import { GmailMessagePart, EmailIngestionResult, ProcessedTicketResult } from "@/types/gmail";

/**
 * Initializes and returns an authenticated Google OAuth2 client.
 */
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("Missing Gmail refresh token in environment");
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function processIncomingEmails(startHistoryId?: string | number): Promise<EmailIngestionResult> {
  const gmail = getGmailClient();
  const processedTickets: ProcessedTicketResult[] = [];
  
  // Fetch projects
  const allProjects = await prisma.project.findMany({
    include: { domains: true },
  });
  const otherProject = allProjects.find((p) => p.name.toLowerCase() === "other");
  if (!otherProject) {
    throw new Error("Fallback project 'Other' does not exist in the database. Please create it via Admin UI.");
  }

  let messagesToProcess: { id: string }[] = [];
  const MAX_PAGES = 5;

  // Delta Sync Engine
  if (startHistoryId) {
    try {
      let pageToken: string | undefined = undefined;
      let pageCount = 0;
      do {
        const params: gmail_v1.Params$Resource$Users$History$List = {
          userId: "me",
          startHistoryId: startHistoryId.toString(),
          historyTypes: ["messageAdded"],
          ...(pageToken ? { pageToken } : {}),
        };
        const historyRes = await gmail.users.history.list(params);
        
        const history = historyRes.data.history || [];
        for (const h of history) {
          if (h.messagesAdded) {
            for (const ma of h.messagesAdded) {
              if (ma.message && ma.message.id) {
                messagesToProcess.push({ id: ma.message.id });
              }
            }
          }
        }
        pageToken = historyRes.data.nextPageToken || undefined;
        pageCount++;
      } while (pageToken && pageCount < MAX_PAGES);
    } catch (err: unknown) {
      console.warn("Delta sync failed (history ID likely expired/invalid), falling back to full inbox query.", err instanceof Error ? err.message : String(err));
      // Fallback
      messagesToProcess = [];
    }
  }

  if (messagesToProcess.length === 0) {
    try {
      let pageToken: string | undefined = undefined;
      let pageCount = 0;
      do {
        const params: gmail_v1.Params$Resource$Users$Messages$List = {
          userId: "me",
          q: "is:unread -category:promotions -category:social -category:forums -from:me -from:google.com -from:github.com",
          ...(pageToken ? { pageToken } : {}),
        };
        const res = await gmail.users.messages.list(params);
        const msgs = (res.data.messages || []).filter((m: { id?: string | null }): m is { id: string } => !!m.id);
        messagesToProcess.push(...msgs);
        pageToken = res.data.nextPageToken || undefined;
        pageCount++;
      } while (pageToken && pageCount < MAX_PAGES);
    } catch (err: unknown) {
      console.error("Full inbox query failed:", err instanceof Error ? err.message : String(err));
    }
  }

  if (messagesToProcess.length === 0) {
    return { processedCount: 0, newTickets: [] };
  }

  // Deduplicate messages to process
  const uniqueMessageIds = Array.from(new Set(messagesToProcess.map(m => m.id)));

  for (const msgId of uniqueMessageIds) {
    const existingLock = await prisma.processedMessage.findUnique({ where: { id: msgId } });
    if (existingLock && (existingLock.status === "COMPLETED" || (existingLock.status === "PROCESSING" && Date.now() - existingLock.lockedAt.getTime() < 5 * 60 * 1000))) {
      continue;
    }

    try {
      if (!existingLock) {
        await prisma.processedMessage.create({
          data: { id: msgId, status: "PROCESSING", lockedAt: new Date() },
        });
      } else {
        await prisma.processedMessage.update({
          where: { id: msgId },
          data: { status: "PROCESSING", lockedAt: new Date() },
        });
      }
    } catch (dbErr: unknown) {
      if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2002") {
        continue;
      }
      console.error(`[Ingest] Database error locking message ${msgId}`, dbErr);
      continue;
    }

    try {
      const fullMsg = await gmail.users.messages.get({ userId: "me", id: msgId, format: "full" });
      const payload = fullMsg.data.payload;
      const headers = payload?.headers || [];

      let fromHeader = "";
      let subject = "(No Subject)";
      let messageId = "";
      let inReplyTo = "";
      let references = "";
      let toHeader = "";
      let ccHeader = "";
      let bccHeader = "";
      let autoSubmitted = false;
      let isNewsletter = false;

      for (const h of headers) {
        const name = h.name?.toLowerCase();
        if (name === "from") fromHeader = h.value || "";
        if (name === "subject") subject = h.value || "";
        if (name === "message-id") messageId = h.value || "";
        if (name === "in-reply-to") inReplyTo = h.value || "";
        if (name === "references") references = h.value || "";
        if (name === "to") toHeader = h.value || "";
        if (name === "cc") ccHeader = h.value || "";
        if (name === "bcc") bccHeader = h.value || "";
        if (name === "auto-submitted" && h.value !== "no") autoSubmitted = true;
        if (name === "x-autoreply") autoSubmitted = true;
        if (name === "list-unsubscribe" || name === "list-id") isNewsletter = true;
      }

      const senderMatch = fromHeader.match(/(.*?)\s*<(.+?)>/);
      let senderName = fromHeader;
      let senderEmail = fromHeader;

      if (senderMatch && senderMatch[2]) {
        senderName = senderMatch[1]?.replace(/"/g, "").trim() || senderMatch[2].trim();
        senderEmail = senderMatch[2].replace(/[<>]/g, "").trim().toLowerCase();
      } else {
        senderEmail = senderEmail.replace(/[<>]/g, "").trim().toLowerCase();
        senderName = senderEmail;
      }

      const senderLower = (senderName + " " + senderEmail).toLowerCase();
      
      const isSystemEmail = senderLower === process.env.DEFAULT_FROM_EMAIL?.toLowerCase() ||
        senderLower.startsWith("noreply@") ||
        senderLower.startsWith("no-reply@") ||
        senderLower.startsWith("donotreply@") ||
        senderLower.startsWith("mailer-daemon@") ||
        senderLower.startsWith("notifications@") ||
        senderLower.startsWith("alert@") ||
        senderLower.startsWith("support@");

      // Infinite Loop Protection
      if (
        autoSubmitted ||
        isNewsletter ||
        isSystemEmail
      ) {
        await gmail.users.messages.modify({
          userId: "me",
          id: msgId,
          requestBody: { removeLabelIds: ["UNREAD"] },
        });
        continue;
      }

      const allExtractedCcs: string[] = [];
      if (ccHeader) {
        const ccParts = ccHeader.split(",");
        for (const part of ccParts) {
          const match = part.match(/<(.+?)>/);
          let email = match ? match[1].trim() : part.trim();
          email = email.toLowerCase().replace(/[<>]/g, "");
          if (email && !email.includes("support@") && email !== process.env.DEFAULT_FROM_EMAIL) {
            allExtractedCcs.push(email);
          }
        }
      }

      let rawBody = "";

      function extractBody(part: GmailMessagePart) {
        if (part.parts) {
          for (const p of part.parts) extractBody(p);
        } else if (part.body && part.body.data) {
          const decoded = Buffer.from(part.body.data, "base64url").toString("utf-8");
          if (part.mimeType === "text/plain") {
            rawBody += decoded + "\n";
          } else if (part.mimeType === "text/html" && !rawBody) {
            let clean = decoded.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            clean = clean.replace(/<[^>]+>/g, " ");
            rawBody += clean + "\n";
          }
        }
      }

      if (payload) extractBody(payload);

      let cleanedBody = trimIncomingEmail(rawBody);
      // Stop extraction at `--` signatures
      cleanedBody = cleanedBody.split(/^--\s*$/m)[0].trim();
      if (!cleanedBody) cleanedBody = "(No Content)";

      const searchContent = (subject + " " + cleanedBody).toLowerCase();
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

      let extractedDomain = "";
      if (senderEmail.includes("@")) {
        extractedDomain = senderEmail.split("@")[1].trim();
      }

      let matchedProject = otherProject;

      if (extractedDomain) {
        const lowerExtractedDomain = extractedDomain.toLowerCase();
        const projectWithDomain = allProjects.find((p) =>
          p.domains.some((d) => {
            const lowerDbDomain = d.domain.toLowerCase();
            return lowerDbDomain === lowerExtractedDomain || lowerExtractedDomain.endsWith("." + lowerDbDomain);
          })
        );

        if (projectWithDomain) {
          matchedProject = projectWithDomain;
        } else {
          const domainLabels = lowerExtractedDomain.split(".");
          const found = allProjects.find((pr) => {
            const normalizedName = pr.name.toLowerCase().replace(/\s/g, "");
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
        create: { email: senderEmail, name: senderName, role: Role.CUSTOMER },
      });

      if (matchedProject.contractEnd && new Date() > new Date(matchedProject.contractEnd)) {
        console.log(`[Ingest] Rejected ticket from User ID: ${user.id} - Project contract expired`);

        try {
          const deterministicMessageId = `expiration-${msgId}@ticketflow.local`;
          const existingMsgs = await gmail.users.messages.list({
            userId: "me",
            q: `rfc822msgid:${deterministicMessageId}`,
          });

          if (!existingMsgs.data.messages || existingMsgs.data.messages.length === 0) {
            const rendered = EmailTemplates.renderProjectExpiration(
              {
                projectName: matchedProject.name,
                emailSubject: subject,
              },
              matchedProject.expirationSubject || undefined,
              matchedProject.expirationBody || undefined
            );

            const fromAddress = process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com";
            const encodedMessage = buildMimeMessage(senderEmail, `"TicketFlow" <${fromAddress}>`, rendered, { messageId: deterministicMessageId });

            await gmail.users.messages.send({
              userId: "me",
              requestBody: { raw: encodedMessage },
            });
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (emailErr: unknown) {
          console.error(`[Ingest] Failed to send expiration email to User ID: ${user.id}`, emailErr);
        }

        try {
          await gmail.users.messages.modify({
            userId: "me",
            id: msgId,
            requestBody: { removeLabelIds: ["UNREAD"] },
          });
        } catch (err: unknown) {
          console.error("Failed to remove UNREAD label", err);
        }

        await prisma.processedMessage.update({
          where: { id: msgId },
          data: { status: "COMPLETED" },
        });

        continue;
      }

      const googleThreadId = fullMsg.data.threadId;
      const cleanMessageId = messageId.replace(/[<>]/g, "").trim();

      let matchedTicket = null;

      const refs = [inReplyTo, ...references.split(/\s+/)]
        .map((r) => r.replace(/[<>]/g, "").trim())
        .filter(Boolean);

      const orConditions: Prisma.TicketWhereInput[] = [];

      if (googleThreadId) {
        orConditions.push({ threadId: googleThreadId });
      }
      if (refs.length > 0) {
        orConditions.push({
          messages: {
            some: {
              messageId: { in: refs },
            },
          },
        });
        orConditions.push({
          messageId: { in: refs },
        });
      }

      if (orConditions.length > 0) {
        matchedTicket = await prisma.ticket.findFirst({
          where: { OR: orConditions },
          include: {
            assignedTo: { select: { email: true } },
            createdBy: { select: { email: true } },
            messages: { select: { messageId: true }, orderBy: { createdAt: 'desc' } },
          },
        });
      }

      if (matchedTicket) {
        if (matchedTicket.status === "CLOSED" || matchedTicket.status === "RESOLVED") {
          const rendered = EmailTemplates.renderTicketClosedBounce({
            ticketId: matchedTicket.id,
            ticketTitle: matchedTicket.title,
            senderName,
            supportUrl: `${process.env.APP_BASE_URL || "http://localhost:3000"}/login`,
          });

          await sendTicketReplyEmail({
            ticket: {
              ...matchedTicket,
              contactEmail: senderEmail,
              assignedTo: null,
              ccEmails: [],
              createdBy: null,
            },
            messageContent: rendered.plainText,
            senderName: "TicketFlow Support",
            htmlOverride: rendered.html,
            subjectOverride: rendered.subject,
          });

          await gmail.users.messages.modify({
            userId: "me",
            id: msgId,
            requestBody: { removeLabelIds: ["UNREAD"] },
          });
          continue;
        }

        const updatedCcEmails = Array.from(new Set([...matchedTicket.ccEmails, ...allExtractedCcs]));

        await prisma.ticketMessage.create({
          data: {
            ticketId: matchedTicket.id,
            senderType: "CLIENT",
            senderEmail,
            content: cleanedBody,
            to: toHeader || null,
            cc: ccHeader || null,
            bcc: bccHeader || null,
            messageId: cleanMessageId || null,
          },
        });

        await prisma.ticket.update({
          where: { id: matchedTicket.id },
          data: {
            lastActivityAt: new Date(),
            ccEmails: updatedCcEmails,
            ...(googleThreadId && !matchedTicket.threadId ? { threadId: googleThreadId } : {}),
          },
        });

        const recipientsToEcho: string[] = [...updatedCcEmails];
        if (matchedTicket.assignedToId) {
          const user = await prisma.user.findUnique({ where: { id: matchedTicket.assignedToId } });
          if (user && user.email && user.email !== senderEmail) {
            recipientsToEcho.push(user.email);
          }
        }

        const creator = await prisma.user.findUnique({ where: { id: matchedTicket.createdById } });
        if (creator && creator.email && creator.email !== senderEmail) {
          recipientsToEcho.push(creator.email);
        }

        const directRecipients = new Set(
          [
            ...toHeader.split(",").map((e) => {
              const match = e.match(/<(.+?)>/);
              return (match ? match[1] : e).toLowerCase().replace(/[<>]/g, "").trim();
            }),
            ...ccHeader.split(",").map((e) => {
              const match = e.match(/<(.+?)>/);
              return (match ? match[1] : e).toLowerCase().replace(/[<>]/g, "").trim();
            }),
          ].filter(Boolean)
        );

        const systemEmail = (process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com").toLowerCase();

        const finalEchoRecipients = Array.from(new Set(recipientsToEcho)).filter(
          (e) => e !== senderEmail && e !== systemEmail && !e.includes("support@") && !directRecipients.has(e)
        );

        if (finalEchoRecipients.length > 0) {
          const fromAddress = systemEmail;
          const attributedPlainText = `[Reply from: ${senderEmail} via TicketFlow]\n\n${cleanedBody}`;
          const attributedHtml = `<p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">[Reply from: <strong>${escapeHtml(senderEmail)}</strong> via TicketFlow]</p><p>${escapeHtml(cleanedBody).replace(/\n/g, "<br/>")}</p>`;

          const renderedEmail = {
            subject: subject,
            html: attributedHtml,
            plainText: attributedPlainText,
          };

          const encodedMessage = buildMimeMessage(
            finalEchoRecipients.join(", "),
            `"TicketFlow" <${fromAddress}>`,
            renderedEmail,
            {
              inReplyTo: messageId,
              references: [inReplyTo, messageId].filter(Boolean).join(" "),
            }
          );

          await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: encodedMessage,
              threadId: googleThreadId || undefined,
            },
          });
        }

        revalidatePath("/tickets");
        revalidatePath(`/tickets/${matchedTicket.id}`);
        revalidateTag("tickets", "max");
        revalidateTag(`ticket-${matchedTicket.id}`, "max");

        broadcastTicketMutation(matchedTicket.id, "MESSAGE_ADDED");

        await gmail.users.messages.modify({
          userId: "me",
          id: msgId,
          requestBody: { removeLabelIds: ["UNREAD"] },
        });

        processedTickets.push({
          ticketId: matchedTicket.id,
          title: matchedTicket.title,
          priority: matchedTicket.priority,
          projectName: matchedProject.name,
        });

        await prisma.processedMessage.update({
          where: { id: msgId },
          data: { status: "COMPLETED" },
        });

        continue;
      }

      const ticket = await prisma.$transaction(async (tx) => {
        const newTicket = await tx.ticket.create({
          data: {
            title: subject,
            description: cleanedBody,
            priority: scoredPriority,
            createdById: user.id,
            projectId: matchedProject.id,
            contactEmail: senderEmail,
            threadId: googleThreadId || null,
            messageId: cleanMessageId || null,
            ccEmails: Array.from(new Set(allExtractedCcs)),
          },
          include: { project: true },
        });

        // NOTE: We intentionally do NOT create a TicketMessage here.
        // The opening email body is stored in ticket.description and displayed
        // in the "Original Issue" card on the detail page. Creating a message
        // here was causing the description to appear as a duplicate CLIENT
        // reply/bubble in the conversation timeline.

        return newTicket;
      });

      await sendNewTicketNotification({
        clientEmail: senderEmail,
        ticketCcEmails: Array.from(new Set(allExtractedCcs)),
        ticketTitle: ticket.title,
        projectName: ticket.project?.name || "Unknown Project",
        ticketId: ticket.id,
        messageId: messageId || undefined,
        threadId: googleThreadId || undefined,
      }).catch((err: unknown) => console.error("Failed to send new ticket email", err));

      revalidatePath("/tickets");
      revalidateTag("tickets", "max");
      revalidateTag(`ticket-${ticket.id}`, "max");
      broadcastTicketCreated(ticket.id);

      await gmail.users.messages.modify({
        userId: "me",
        id: msgId,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });

      processedTickets.push({
        ticketId: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        projectName: matchedProject.name,
      });

      await prisma.processedMessage.update({
        where: { id: msgId },
        data: { status: "COMPLETED" },
      });
    } catch (err: unknown) {
      console.error(`[Ingest] Error processing message ${msgId}. Continuing to next message.`, err);
      try {
        await prisma.processedMessage.update({
          where: { id: msgId },
          data: { status: "FAILED" },
        });
      } catch (updateErr) {
        console.error("Failed to update lock to FAILED", updateErr);
      }
    }
  }

  return {
    processedCount: processedTickets.length,
    newTickets: processedTickets,
  };
}
