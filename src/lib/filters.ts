import { Prisma } from "@prisma/client";
import { getTicketInput } from "@/lib/validations/tickets";
import { User } from "next-auth";
import { can } from "@/lib/auth/policy";

export function buildTicketFilters(
  params: getTicketInput,
  user: User
): Prisma.TicketWhereInput {
  const {
    search,
    status,
    priority,
    createdById,
    projectId,
    startDate,
    endDate,
    assignedToId,
  } = params;

  const isCustomer = !can(user, "ticket:view");
  const where: Prisma.TicketWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (isCustomer) {
    where.createdById = user.id;
  } else if (createdById) {
    where.createdById = createdById;
  }

  if (projectId) where.projectId = projectId;

  if (assignedToId && assignedToId !== "ALL") {
    where.assignedToId = assignedToId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      // Ensure endDate includes the full day until 23:59:59.999Z for reliable filtering
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return where;
}
