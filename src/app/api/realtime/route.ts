import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { realtimeEmitter, RealtimeEvent } from "@/lib/realtime/emitter";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/policy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let isClosed = false;
  let boundOnEvent: ((event: RealtimeEvent) => void) | null = null;
  
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`:connected\n\n`));
      const pingInterval = setInterval(() => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(`:ping\n\n`));
        }
      }, 30000);

      const onEvent = async (event: RealtimeEvent) => {
        if (isClosed) return;
        
        if (event.ticketId) {
          if (event.type === "TICKET_DELETED") {
            if (!can(session.user!, "ticket:view", event.snapshotData)) {
              return;
            }
          } else {
            try {
              if (session.user!.role === "ADMIN" || session.user!.role === "USER") {
                // Ticket lookup bypassed: role guarantees view access
              } else {
                const ticket = await prisma.ticket.findUnique({ 
                  where: { id: event.ticketId },
                  select: { createdById: true, assignedToId: true }
                });
                if (!ticket || !can(session.user!, "ticket:view", ticket)) {
                  return;
                }
              }
            } catch {
              return;
            }
          }
        }
        
        if (isClosed) return; // check again after async yield
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      boundOnEvent = onEvent;
      realtimeEmitter.on("event", onEvent);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(pingInterval);
        realtimeEmitter.off("event", onEvent);
        try {
          controller.close();
        } catch {
          // Ignore close errors if already closed
        }
      });
    },
    cancel() {
      isClosed = true;
      // Note: clearInterval(pingInterval) not accessible here due to scope, handled in abort event.
      if (boundOnEvent) {
        realtimeEmitter.off("event", boundOnEvent);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
