import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { Priority, Role, Prisma } from "@prisma/client";
import { EmailTemplates, buildMimeMessage, escapeHtml } from "@/lib/email-templates";
import { sendNewTicketNotification } from "@/lib/email";
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

  // Delta Sync Engine
  if (startHistoryId) {
    try {
      const historyRes = await gmail.users.history.list({
        userId: "me",
        startHistoryId: startHistoryId.toString(),
        historyTypes: ["messageAdded"],
      });
      
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
    } catch (err: unknown) {
      console.warn("Delta sync failed (history ID likely expired/invalid), falling back to full inbox query.", err instanceof Error ? err.message : String(err));
      // Fallback
      messagesToProcess = [];
    }
  }

  if (messagesToProcess.length === 0) {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread -category:promotions -category:social -category:forums -from:me -from:google.com -from:github.com",
      maxResults: 50,
    });
    messagesToProcess = (res.data.messages || []).filter((m): m is { id: string } => !!m.id);
  }

  if (messagesToProcess.length === 0) {
    return { processedCount: 0, newTickets: [] };
  }

  // Deduplicate messages to process
  const uniqueMessageIds = Array.from(new Set(messagesToProcess.map(m => m.id)));

  for (const msgId of uniqueMessageIds) {
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
      
      // Infinite Loop Protection
      if (
        autoSubmitted ||
        isNewsletter ||
        senderLower.includes("noreply") ||
        senderLower.includes("no-reply") ||
        senderLower.includes("donotreply") ||
        senderLower.includes("mailer-daemon") ||
        senderLower.includes("notifications@") ||
        senderLower.includes("alert@") ||
        senderLower.includes("support@")
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

        let shouldProcess = false;
        let alreadySent = false;

        try {
          await prisma.processedMessage.create({
            data: { id: msgId, status: "PROCESSING", lockedAt: new Date() },
          });
          shouldProcess = true;
        } catch (dbErr: unknown) {
          if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2002") {
            const existing = await prisma.processedMessage.findUnique({ where: { id: msgId } });
            if (existing) {
              if (existing.status === "SENT") {
                alreadySent = true;
              } else if (existing.status === "PROCESSING") {
                const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
                if (existing.lockedAt < fiveMinsAgo) {
                  const updated = await prisma.processedMessage.updateMany({
                    where: { id: msgId, status: "PROCESSING", lockedAt: existing.lockedAt },
                    data: { lockedAt: new Date() },
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
            const deterministicMessageId = `expiration-${msgId}@ticketflow.local`;
            const existingMsgs = await gmail.users.messages.list({
              userId: "me",
              q: `rfc822msgid:${deterministicMessageId}`,
            });

            if (existingMsgs.data.messages && existingMsgs.data.messages.length > 0) {
              await prisma.processedMessage.update({
                where: { id: msgId },
                data: { status: "SENT" },
              });
              alreadySent = true;
            } else {
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

              await prisma.processedMessage.update({
                where: { id: msgId },
                data: { status: "SENT" },
              });
              alreadySent = true;
            }
          } catch (emailErr: unknown) {
            console.error(`[Ingest] Failed to send expiration email to User ID: ${user.id}`, emailErr);
            continue;
          }
        }

        if (alreadySent) {
          try {
            await gmail.users.messages.modify({
              userId: "me",
              id: msgId,
              requestBody: { removeLabelIds: ["UNREAD"] },
            });
          } catch (err: unknown) {
            console.error("Failed to remove UNREAD label", err);
          }
        }
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
      }

      if (orConditions.length > 0) {
        matchedTicket = await prisma.ticket.findFirst({
          where: { OR: orConditions },
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

          const fromAddress = process.env.GOOGLE_EMAIL || process.env.DEFAULT_FROM_EMAIL || "support@ticketflow.com";
          const encodedMessage = buildMimeMessage(senderEmail, `"TicketFlow" <${fromAddress}>`, rendered, {
            inReplyTo: messageId,
            references: [inReplyTo, messageId].filter(Boolean).join(" "),
          });

          await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encodedMessage },
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
          },
        });

        const recipientsToEcho: string[] = [...updatedCcEmails];
        if (matchedTicket.assignedToId) {
          const agent = await prisma.user.findUnique({ where: { id: matchedTicket.assignedToId } });
          if (agent && agent.email && agent.email !== senderEmail) {
            recipientsToEcho.push(agent.email);
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

        continue;
      }

      const ticket = await prisma.ticket.create({
        data: {
          title: subject,
          description: cleanedBody,
          priority: scoredPriority,
          createdById: user.id,
          projectId: matchedProject.id,
          contactEmail: senderEmail,
          threadId: googleThreadId || null,
          ccEmails: Array.from(new Set(allExtractedCcs)),
          messages: {
            create: {
              senderType: "CLIENT",
              senderEmail,
              content: cleanedBody,
              to: toHeader || null,
              cc: ccHeader || null,
              bcc: bccHeader || null,
              messageId: cleanMessageId || null,
            },
          },
        },
        include: { project: true },
      });

      await sendNewTicketNotification({
        to: senderEmail,
        ticketTitle: ticket.title,
        projectName: ticket.project?.name || "Unknown Project",
        ticketId: ticket.id,
        messageId: messageId || undefined,
        threadId: googleThreadId || undefined,
      }).catch((err: unknown) => console.error("Failed to send new ticket email", err));

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
    } catch (err: unknown) {
      console.error(`[Ingest] Error processing message ${msgId}. Continuing to next message.`, err);
    }
  }

  return {
    processedCount: processedTickets.length,
    newTickets: processedTickets,
  };
}
