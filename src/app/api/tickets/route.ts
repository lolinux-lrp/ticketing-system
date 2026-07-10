import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTicketSchema, getTicketSchema } from "@/lib/validations/tickets";
import { can } from "@/lib/auth/policy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session.user, "ticket:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    console.error("Error creating Ticket:", error);
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

    if (search) {
      const isCustomer = !can(session.user, "ticket:view");

      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(isCustomer ? { createdById: session.user.id } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return NextResponse.json({ data: tickets });
    }

    // Normal filtered query (no search term)
    const where: Prisma.TicketWhereInput = {
      status,
      priority,
      createdById,
    };

    if (!can(session.user, "ticket:view")) {
      where.createdById = session.user.id;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: order } as Prisma.TicketOrderByWithRelationInput,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ data: tickets });
  } catch (error) {
    console.error("Error fetching tickets: ", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}