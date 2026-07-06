import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommentSchema = z.object({
    content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = createCommentSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        // Confirm ticket exists and the user is allowed to comment on it
        const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        if (session.user.role === "CUSTOMER" && ticket.createdById !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const comment = await prisma.comment.create({
            data: {
                content: result.data.content,
                ticketId: params.id,
                authorId: session.user.id,
            },
            include: { author: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        console.error("Create comment error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}