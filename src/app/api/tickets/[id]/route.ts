import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTicketSchema } from "@/lib/validations/tickets";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface udParams {
  //update and delete params
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: udParams) {
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
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (session.user.role === "CUSTOMER" && ticket.createdById !== session.user.id) {
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

export async function PATCH(req: NextRequest, { params }: udParams) {
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

    if (session.user.role === "CUSTOMER") {
      if (existingTicket.createdById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (validation.data.status || validation.data.priority || validation.data.assignedToId !== undefined || validation.data.workDone !== undefined) {
        return NextResponse.json({ error: "Forbidden: Cannot update status, priority, assignee, or work progress" }, { status: 403 });
      }
    }

    if (session.user.role === "AGENT") {
      if (validation.data.assignedToId !== undefined) {
        if (validation.data.assignedToId !== null && validation.data.assignedToId !== session.user.id) {
          return NextResponse.json({ error: "Forbidden: Agents can only assign to themselves" }, { status: 403 });
        }
      }
    }

    // Anyone modifying title or description MUST be the creator
    if (validation.data.title !== undefined || validation.data.description !== undefined) {
      if (existingTicket.createdById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: Only the ticket creator can edit the title and description" }, { status: 403 });
      }
    }

    const updateTicket = await prisma.ticket.update({
      where: { id },
      data: validation.data,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(updateTicket, { status: 200 });
  } catch (e) {
    console.error("Error updating Ticket: ", e);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: udParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const deletedTicket = await prisma.ticket.delete({
      where: { id },
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
