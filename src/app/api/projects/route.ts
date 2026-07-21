import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  domains: z.array(z.string().trim().toLowerCase().regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, "Invalid domain format")).default([]),
  contractStart: z.string().date("Invalid start date").nullable().optional(),
  contractEnd: z.string().date("Invalid end date").nullable().optional(),
  expirationSubject: z.string().nullable().optional(),
  expirationBody: z.string().nullable().optional(),
}).refine((data) => {
  if (data.contractStart && data.contractEnd) {
    return new Date(data.contractEnd) > new Date(data.contractStart);
  }
  return true;
}, {
  message: "Contract end date must be after start date",
  path: ["contractEnd"],
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      include: { domains: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: projects }, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects: ", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.format() }, { status: 400 });
    }

    const { name, domains, contractStart, contractEnd, expirationSubject, expirationBody } = parsed.data;

    const newProject = await prisma.project.create({
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

    return NextResponse.json({ data: newProject }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating project: ", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A project with that name or domain already exists." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
