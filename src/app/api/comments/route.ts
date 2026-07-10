import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createCommentSchema, 
  getCommentSchema, 
  deleteCommentSchema 
} from "@/lib/validations/comments";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/auth/policy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
        body.authorId = session.user.id;
    
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.issues }, { status: 400 });
    }

    const { ticketId, content } = validation.data;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!can(session.user, "comment:create", ticket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newComment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: session.user.id,
        content
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error creating Comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    
    const validation = getCommentSchema.safeParse(urlParams);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.issues }, { status: 400 });
    }
    
    const { ticketId } = validation.data;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!can(session.user, "ticket:view", ticket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { 
        ticketId 
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true, 
          },
        },
      },
      orderBy: {
        createdAt: "asc", 
      },
    });

    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = deleteCommentSchema.safeParse(urlParams);

    if (!validation.success) {
      return NextResponse.json({
        errors: validation.error.issues,
      }, { status: 400 });
    }

    const { id } = validation.data;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { ticket: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (!can(session.user, "comment:delete", comment)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deletedComment = await prisma.comment.delete({
      where:{ id },
    })

    return NextResponse.json(deletedComment, { status: 200 });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}