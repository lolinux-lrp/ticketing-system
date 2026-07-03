import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTicketSchema } from "@/lib/validations/tickets";

interface udParams {
  //update and delete params
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: udParams) {
  try {
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
