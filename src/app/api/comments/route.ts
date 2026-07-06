import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createCommentSchema, 
  getCommentSchema, 
  /*updateCommentSchema,*/ 
  deleteCommentSchema 
} from "@/lib/validations/comments";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.issues }, { status: 400 });
    }

    const { ticketId, authorId, content } = validation.data;

    const newComment = await prisma.comment.create({
      data: {
        ticketId,
        authorId,
        content
      }
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error creating Comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    

    const validation = getCommentSchema.safeParse(urlParams);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.issues }, { status: 400 });
    }
    
    const { ticketId } = validation.data;


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
    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = deleteCommentSchema.safeParse(urlParams);

    if (!validation.success) {
      return NextResponse.json({
        errors: validation.error.issues,
      }, { status: 400 });
    }

    const { id } = validation.data;

    const deletedComment = await prisma.comment.delete({
      where:{id},
    })

    return NextResponse.json(deletedComment, { status: 200 });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}