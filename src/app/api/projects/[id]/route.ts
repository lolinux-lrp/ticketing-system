import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  domains: z.array(z.string()).default([]),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  expirationSubject: z.string().nullable().optional(),
  expirationBody: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.format() }, { status: 400 });
    }

    const { name, domains, contractStart, contractEnd, expirationSubject, expirationBody } = parsed.data;

    // Use a transaction to ensure domain replacement is atomic
    const updatedProject = await prisma.$transaction(async (tx) => {
      // First, check if the project exists
      const existingProject = await tx.project.findUnique({
        where: { id: projectId }
      });

      if (!existingProject) {
        throw new Error("Project not found");
      }

      // Delete existing domains
      await tx.projectDomain.deleteMany({
        where: { projectId: projectId }
      });

      // Update project and recreate domains
      return await tx.project.update({
        where: { id: projectId },
        data: {
          name,
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
          expirationSubject: expirationSubject || null,
          expirationBody: expirationBody || null,
          domains: {
            create: domains.map((domain) => ({ domain })),
          },
        },
        include: {
          domains: true,
        },
      });
    });

    return NextResponse.json({ data: updatedProject }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating project: ", error);
    
    if (error instanceof Error && error.message === "Project not found") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A project with that name or domain already exists." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}
