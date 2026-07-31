import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  InsightsData,
  VolumeMetrics,
  VelocityMetrics,
  QualityMetrics,
  LeaderboardEntry,
  TrendData,
} from "@/types/insights";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const projectId = searchParams.get("projectId");
    const priority = searchParams.get("priority");
    const userId = searchParams.get("userId");

    // Strict RBAC: If fetching for a specific user, ensure it's the current user OR an ADMIN
    if (userId) {
      const userRole = (session.user as { role?: string }).role;
      const sessionUserId = (session.user as { id?: string }).id;
      
      if (userRole !== "ADMIN" && sessionUserId !== userId) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view this user's insights." },
          { status: 403 }
        );
      }
    }

    let startDate: Date;
    let endDate: Date = new Date();

    if (timeframe === "custom" && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      startDate = new Date();
      if (timeframe === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }
    }

    const baseWhere: Prisma.TicketWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (projectId && projectId !== "all") {
      baseWhere.projectId = projectId;
    }
    
    if (priority && priority !== "all") {
      baseWhere.priority = priority as Prisma.EnumPriorityFilter | "P1" | "P2" | "P3" | "P4";
    }

    if (userId) {
      baseWhere.assignedToId = userId;
    }

    // 1. Prisma count for Volume Metrics
    const totalTickets = await prisma.ticket.count({ where: baseWhere });
    const resolvedTickets = await prisma.ticket.count({
      where: { ...baseWhere, status: "RESOLVED" },
    });
    const backlogCount = await prisma.ticket.count({
      where: { ...baseWhere, status: { in: ["OPEN", "IN_PROGRESS"] } },
    });

    const resolutionRatePercentage =
      totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

    const volume: VolumeMetrics = {
      totalTickets,
      resolvedTickets,
      backlogCount,
      resolutionRatePercentage,
    };

    // 2. Prisma groupBy for Leaderboard
    const leaderboardGroups = await prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: { ...baseWhere, status: "RESOLVED", assignedToId: { not: null } },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const userIds = leaderboardGroups
      .map((g) => g.assignedToId)
      .filter((id): id is string => id !== null);

    const usersMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      users.forEach((u) => {
        if (u.name) usersMap[u.id] = u.name;
      });
    }

    const leaderboard: LeaderboardEntry[] = leaderboardGroups.map((g) => {
      const userId = g.assignedToId as string;
      return {
        userId,
        name: usersMap[userId] || "Unknown User",
        resolvedCount: g._count.id,
        // Calculate SLA compliance later or mock if tracking is complex, using 100% as baseline for now if resolved
        slaCompliancePercentage: 100,
      };
    });

    // 3. To get Velocity, Quality, and Trends, we need timestamp data.
    // We fetch a lightweight projection to calculate everything on the server
    const ticketsForMetrics = await prisma.ticket.findMany({
      where: baseWhere,
      select: {
        id: true,
        createdAt: true,
        resolvedAt: true,
        status: true,
        messages: {
          where: {
            senderType: { in: ["AGENT", "SYSTEM"] },
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    });

    let totalResolutionTime = 0;
    let resolvedWithTimeCount = 0;
    let totalFirstResponseTime = 0;
    let respondedTicketsCount = 0;
    let slaCompliantCount = 0;

    const trendsMap: Record<string, { created: number; resolved: number }> = {};

    ticketsForMetrics.forEach((t) => {
      // Trend processing
      const dateKey = t.createdAt.toISOString().split("T")[0];
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { created: 0, resolved: 0 };
      }
      trendsMap[dateKey].created += 1;

      if (t.status === "RESOLVED" && t.resolvedAt) {
        const resolvedDateKey = t.resolvedAt.toISOString().split("T")[0];
        if (!trendsMap[resolvedDateKey]) {
          trendsMap[resolvedDateKey] = { created: 0, resolved: 0 };
        }
        trendsMap[resolvedDateKey].resolved += 1;

        // Velocity: Resolution Time
        const resolutionTimeMs = t.resolvedAt.getTime() - t.createdAt.getTime();
        totalResolutionTime += resolutionTimeMs / (1000 * 60 * 60);
        resolvedWithTimeCount += 1;

        // SLA Compliance (assuming < 24h is compliant for example purposes)
        if (resolutionTimeMs <= 24 * 60 * 60 * 1000) {
          slaCompliantCount += 1;
        }
      }

      // Velocity: First Response Time
      if (t.messages.length > 0) {
        const firstMsgDate = t.messages[0].createdAt;
        const responseTimeMs = firstMsgDate.getTime() - t.createdAt.getTime();
        totalFirstResponseTime += responseTimeMs / (1000 * 60 * 60);
        respondedTicketsCount += 1;
      }
    });

    const averageResolutionTime =
      resolvedWithTimeCount > 0
        ? totalResolutionTime / resolvedWithTimeCount
        : 0;

    const timeToFirstResponse =
      respondedTicketsCount > 0
        ? totalFirstResponseTime / respondedTicketsCount
        : 0;

    const slaCompliancePercentage =
      resolvedTickets > 0 ? (slaCompliantCount / resolvedTickets) * 100 : 0;
    
    // For now reopen rate is a placeholder (needs audit log to track properly)
    const reopenRatePercentage = 0; 

    const velocity: VelocityMetrics = {
      averageResolutionTime,
      timeToFirstResponse,
    };

    const quality: QualityMetrics = {
      slaCompliancePercentage,
      reopenRatePercentage,
    };

    const trends: TrendData[] = Object.entries(trendsMap)
      .map(([date, counts]) => ({
        date,
        created: counts.created,
        resolved: counts.resolved,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const responsePayload: InsightsData = {
      volume,
      velocity,
      quality,
      leaderboard,
      trends,
    };

    return NextResponse.json({ data: responsePayload }, { status: 200 });
  } catch (error) {
    console.error("Insights API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
