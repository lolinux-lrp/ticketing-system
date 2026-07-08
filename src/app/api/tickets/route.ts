import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTicketSchema, getTicketSchema } from "@/lib/validations/tickets";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }
    const { description, title } = validation.data;

    // Always use the logged-in user's ID — never trust a createdById from the client
    const newTicket = await prisma.ticket.create({
      data: {
        createdById: session.user.id,
        description,
        title,
      },
    });

    return NextResponse.json({ ticket: newTicket }, { status: 201 });
  } catch (error) {
    console.log("Error creating Ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Full-text search path
    if (search) {
      const isCustomer = session.user.role === "CUSTOMER";

      const rawTickets = await prisma.$queryRaw<any[]>`
        SELECT t.id,
          ts_rank(t."searchVector", websearch_to_tsquery('english', ${search})) AS rank
        FROM "Ticket" t
        WHERE t."searchVector" @@ websearch_to_tsquery('english', ${search})
          ${status ? Prisma.sql`AND t.status = ${status}::"Status"` : Prisma.empty}
          ${priority ? Prisma.sql`AND t.priority = ${priority}::"Priority"` : Prisma.empty}
          ${isCustomer ? Prisma.sql`AND t."createdById" = ${session.user.id}` : Prisma.empty}
        ORDER BY rank DESC
        LIMIT 50
      `;

      const ticketIds = rawTickets.map((t) => t.id);
      const withRelations = await prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      const ordered = ticketIds
        .map((id) => withRelations.find((t) => t.id === id))
        .filter(Boolean);

      return NextResponse.json({ data: ordered });
    }

    // Normal filtered query (no search term)
    const where: Prisma.TicketWhereInput = {
      status,
      priority,
      createdById,
    };

    // Customers only ever see their own tickets, regardless of createdById passed in
    if (session.user.role === "CUSTOMER") {
      where.createdById = session.user.id;
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