import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createTicketSchema, getTicketSchema } from "@/lib/validations/tickets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }
    const { createdById, description, title } = validation.data;

    const newTicket = await prisma.ticket.create({
      data: {
        createdById,
        description,
        title,
      },
    });

    return NextResponse.json(newTicket, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = getTicketSchema.safeParse(urlParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { search, status, priority, createdById, sortBy, order } =
      validation.data;

    const where: Prisma.TicketWhereInput = {
      status,
      priority,
      createdById,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: order } as Prisma.TicketOrderByWithRelationInput,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ data: tickets });
  } catch (error) {
    console.log("Error fetching tickets: ", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}


