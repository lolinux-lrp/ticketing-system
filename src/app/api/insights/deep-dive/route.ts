import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseInsightsFilters } from "@/lib/insights-filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { error: filterError, status, filters } = await parseInsightsFilters(req);
    if (filterError || !filters) {
      return NextResponse.json({ error: filterError }, { status: status || 500 });
    }
    const { baseWhere, page, limit } = filters;

    const skip = (page - 1) * limit;

    const [total, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where: baseWhere }),
      prisma.ticket.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          resolvedAt: true,
          assignedToId: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: tickets,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Insights Deep Dive API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
