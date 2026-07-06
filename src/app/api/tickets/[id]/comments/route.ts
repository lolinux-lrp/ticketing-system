import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface udParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: udParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await req.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 },
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (session.user.role === "CUSTOMER" && ticket.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        ticketId: ticketId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    console.error("Error creating comment: ", e);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 },
    );
  }
}
