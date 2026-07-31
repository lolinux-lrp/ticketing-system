import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseInsightsFilters } from "@/lib/insights-filters";
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
    const { error: filterError, status, filters } = await parseInsightsFilters(req);
    if (filterError || !filters) {
      return NextResponse.json({ error: filterError }, { status: status || 500 });
    }
    const { baseWhere, startDate, endDate } = filters;

    const globalBaseWhere = { ...baseWhere };
    delete globalBaseWhere.status;

    // 1. Prisma count for Volume Metrics
    const [totalTickets, resolvedTickets, backlogCount] = await prisma.$transaction([
      prisma.ticket.count({ where: globalBaseWhere }),
      prisma.ticket.count({
        where: { ...globalBaseWhere, status: "RESOLVED" },
      }),
      prisma.ticket.count({
        where: { ...globalBaseWhere, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);

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
        slaCompliancePercentage: 0, // Placeholder as we calculate this below per user or omit it visually later
      };
    });

    // 3. To get Velocity, Quality, and Trends, we need timestamp data.
    const ticketsForMetrics = await prisma.ticket.findMany({
      where: baseWhere,
      select: {
        id: true,
        createdAt: true,
        resolvedAt: true,
        status: true,
        assignedToId: true,
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
    const userSlaMap: Record<string, { resolved: number; compliant: number }> = {};

    ticketsForMetrics.forEach((t) => {
      // Trend processing (using UTC to be consistent)
      const dateKey = t.createdAt.toISOString().split("T")[0];
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { created: 0, resolved: 0 };
      }
      trendsMap[dateKey].created += 1;

      if (t.status === "RESOLVED" && t.resolvedAt) {
        // Only count resolved for trends if the resolved date is within our timeframe
        if (t.resolvedAt >= startDate && t.resolvedAt <= endDate) {
          const resolvedDateKey = t.resolvedAt.toISOString().split("T")[0];
          if (!trendsMap[resolvedDateKey]) {
            trendsMap[resolvedDateKey] = { created: 0, resolved: 0 };
          }
          trendsMap[resolvedDateKey].resolved += 1;
        }

        // Velocity: Resolution Time
        const resolutionTimeMs = t.resolvedAt.getTime() - t.createdAt.getTime();
        totalResolutionTime += resolutionTimeMs / (1000 * 60 * 60);
        resolvedWithTimeCount += 1;

        // SLA Compliance (< 24h)
        const isCompliant = resolutionTimeMs <= 24 * 60 * 60 * 1000;
        if (isCompliant) {
          slaCompliantCount += 1;
        }

        if (t.assignedToId) {
          if (!userSlaMap[t.assignedToId]) {
            userSlaMap[t.assignedToId] = { resolved: 0, compliant: 0 };
          }
          userSlaMap[t.assignedToId].resolved += 1;
          if (isCompliant) userSlaMap[t.assignedToId].compliant += 1;
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

    leaderboard.forEach((entry) => {
      const stats = userSlaMap[entry.userId];
      if (stats && stats.resolved > 0) {
        entry.slaCompliancePercentage = (stats.compliant / stats.resolved) * 100;
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
      resolvedWithTimeCount > 0 ? (slaCompliantCount / resolvedWithTimeCount) * 100 : 0;
    
    // For now reopen rate is a placeholder
    const reopenRatePercentage = null; 

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
