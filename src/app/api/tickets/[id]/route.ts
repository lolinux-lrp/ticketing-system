import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTicketSchema } from "@/lib/validations/tickets";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendTicketAssignmentEmail } from "@/lib/email";
import { RouteParams } from "@/types/api";
import { can } from "@/lib/auth/policy";

import { revalidatePath, revalidateTag } from "next/cache";
import { broadcastTicketMutation, broadcastTicketDeleted } from "@/lib/realtime/emitter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        project: true,
        messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!can(session.user, "ticket:view", ticket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (e) {
    console.error("Error fetching Ticket: ", e);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const data = validation.data;

    if (!can(session.user, "ticket:view", existingTicket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (data.title !== undefined || data.description !== undefined) {
      if (!can(session.user, "ticket:update_content", existingTicket)) {
        return NextResponse.json({ error: "Forbidden: Only the ticket creator can edit the title and description" }, { status: 403 });
      }
    }

    if (data.status !== undefined || data.priority !== undefined || data.resolution !== undefined) {
      if (!can(session.user, "ticket:update_workflow", existingTicket)) {
        return NextResponse.json({ error: "Forbidden: Cannot update status, priority, or work progress" }, { status: 403 });
      }
    }

    if (data.assignedToId !== undefined) {
      if (!can(session.user, "ticket:assign", { ...existingTicket, assignedToId: data.assignedToId })) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions to assign this ticket" }, { status: 403 });
      }
    }

    // Phase 1 — Unassigned Status Guard
    // A ticket must be assigned to an agent before its status can be moved away from OPEN.
    if (data.status !== undefined && data.status !== "OPEN") {
      const finalAssignedToId = data.assignedToId !== undefined 
        ? data.assignedToId 
        : existingTicket.assignedToId;

      if (finalAssignedToId === null) {
        return NextResponse.json(
          { error: "A ticket must be assigned to an agent before its status can be changed." },
          { status: 400 },
        );
      }
    }

    // Phase 2 — Reassignment Theft Guard
    // Only an ADMIN may change the assignee of a ticket that is already claimed.
    if (
      data.assignedToId !== undefined &&
      existingTicket.assignedToId !== null &&
      data.assignedToId !== existingTicket.assignedToId &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only administrators can reassign a ticket that has already been claimed." },
        { status: 403 },
      );
    }

    const resolvedAt: Date | null | undefined =
      data.status === "RESOLVED"
        ? new Date()
        : data.status === "OPEN" || data.status === "IN_PROGRESS"
          ? null
          : undefined; // CLOSED or no status change — leave resolvedAt intact

    const updateTicket = await prisma.ticket.update({
      where: { id },
      data: {
        ...data,
        ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    // Send assignment email if the assignee changed to a real user
    const assigneeChanged =
      validation.data.assignedToId !== undefined &&
      validation.data.assignedToId !== null &&
      validation.data.assignedToId !== existingTicket.assignedToId;

    if (assigneeChanged && updateTicket.assignedTo?.email) {
      // Fire-and-forget — don't block the response
      sendTicketAssignmentEmail({
        assigneeName: updateTicket.assignedTo.name ?? updateTicket.assignedTo.email,
        assigneeEmail: updateTicket.assignedTo.email,
        ticketTitle: updateTicket.title,
        ticketId: updateTicket.id,
        assignedByName: session.user.name ?? session.user.email ?? "Someone",
      }).catch((err) => console.error("Failed to send assignment email:", err));
    }

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    revalidateTag("tickets", "max");
    revalidateTag(`ticket-${id}`, "max");

    broadcastTicketMutation(id, "STATUS_CHANGED");

    return NextResponse.json(updateTicket, { status: 200 });
  } catch (e) {
    console.error("Error updating Ticket: ", e);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!can(session.user, "ticket:delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const activeMeetings = await prisma.meeting.findMany({
      where: { ticketId: id, externalGoogleEventId: { not: null } },
      select: { externalGoogleEventId: true }
    });

    if (activeMeetings.length > 0) {
      const { deleteGoogleMeetRoom } = await import("@/lib/calendar/googleMeet");
      const eventIds = activeMeetings.map(m => m.externalGoogleEventId as string);
      const results = await Promise.allSettled(
        eventIds.map(async (eventId) => {
          try {
            await deleteGoogleMeetRoom(eventId);
          } catch (err: unknown) {
            const errorObj = err as Record<string, unknown>;
            const status = errorObj?.status ?? errorObj?.code;
            const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            
            if (status === 404 || status === 410 || message.includes("not found") || message.includes("gone")) {
              return; // Resolve successfully, it's already gone
            }
            throw err;
          }
        })
      );
      
      const hasRejections = results.some((result, index) => {
        if (result.status === "rejected") {
          console.error(`[DELETE /api/tickets/[id]] Failed to delete Google Meet room (event ID: ${eventIds[index]}):`, result.reason);
          return true;
        }
        return false;
      });

      if (hasRejections) {
        return NextResponse.json(
          { error: "Failed to dissolve active Google Meet rooms. Ticket deletion aborted to prevent orphaned rooms." },
          { status: 500 }
        );
      }
    }

    const deletedTicket = await prisma.ticket.delete({
      where: { id },
    });

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    revalidateTag("tickets", "max");
    revalidateTag(`ticket-${id}`, "max");

    broadcastTicketDeleted(id, {
      createdById: deletedTicket.createdById,
      assignedToId: deletedTicket.assignedToId,
    });

    return NextResponse.json(
      { message: "Ticket deleted successfully", data: deletedTicket },
      { status: 200 },
    );
  } catch (e) {
    console.error("Error deleting Ticket: ", e);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 },
    );
  }
}
