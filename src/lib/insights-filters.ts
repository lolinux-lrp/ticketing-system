import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { Status, Priority } from "@/types";

export interface ParsedFilters {
  baseWhere: Prisma.TicketWhereInput;
  startDate: Date;
  endDate: Date;
  page: number;
  limit: number;
  status?: Status;
}

export async function parseInsightsFilters(req: NextRequest | Request): Promise<{ error?: string; status?: number; filters?: ParsedFilters }> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: "Unauthorized", status: 401 };
  }

  // Get search Params
  let searchParams: URLSearchParams;
  if ('nextUrl' in req) {
    searchParams = (req as NextRequest).nextUrl.searchParams;
  } else {
    searchParams = new URL(req.url).searchParams;
  }

  const timeframe = searchParams.get("timeframe") || "month";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const projectId = searchParams.get("projectId");
  const priority = searchParams.get("priority");
  const userId = searchParams.get("userId");
  const statusParam = searchParams.get("status");
  const pageStr = searchParams.get("page");

  const userRole = (session.user as { role?: string }).role;
  const sessionUserId = (session.user as { id?: string }).id;

  // Strict RBAC
  if (userId) {
    if (userRole !== "ADMIN" && sessionUserId !== userId) {
      return { error: "Forbidden: You do not have permission to view this user's insights.", status: 403 };
    }
  }

  let startDate: Date;
  let endDate: Date = new Date();

  if (timeframe === "custom") {
    if (!startDateParam || !endDateParam) {
      return { error: "Bad Request: startDate and endDate are required for custom timeframe", status: 400 };
    }
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: "Bad Request: Invalid date format", status: 400 };
    }
    if (startDate > endDate) {
      return { error: "Bad Request: startDate cannot be after endDate", status: 400 };
    }
    // Make end date inclusive of the entire day in UTC
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    if (timeframe === "today") {
      startDate.setUTCHours(0, 0, 0, 0);
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
    const validPriorities = ["P1", "P2", "P3", "P4"];
    if (!validPriorities.includes(priority)) {
      return { error: "Bad Request: Invalid priority", status: 400 };
    }
    baseWhere.priority = priority as Priority;
  }

  if (userId) {
    baseWhere.assignedToId = userId;
  } else if (userRole !== "ADMIN" && sessionUserId) {
    baseWhere.assignedToId = sessionUserId;
  }

  if (statusParam) {
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (!validStatuses.includes(statusParam)) {
      return { error: "Bad Request: Invalid status", status: 400 };
    }
    baseWhere.status = statusParam as Status;
  }

  let page = 1;
  if (pageStr) {
    const parsedPage = parseInt(pageStr, 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  return {
    filters: {
      baseWhere,
      startDate,
      endDate,
      page,
      limit: 50,
      status: statusParam ? (statusParam as Status) : undefined
    }
  };
}
