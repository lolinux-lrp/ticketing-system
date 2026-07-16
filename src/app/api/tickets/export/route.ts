import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/policy";

export const dynamic = "force-dynamic";

function escapeCSV(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  const stringField = String(field);
  // If the field contains quotes, commas, or newlines, escape it
  if (/[",\n\r]/.test(stringField)) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow agents or admins to export
    if (!can(session.user, "ticket:view") && session.user.role !== "ADMIN") {
      // If needed in the future, we can add a specific `ticket:export` permission.
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: Prisma.TicketWhereInput = {};

    // Customer can only export their own tickets
    if (!can(session.user, "ticket:view")) {
      where.createdById = session.user.id;
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        where.createdAt.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        // Ensure endDate includes the full day until 23:59:59.999Z
        endDate.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        assignedTo: true,
        createdBy: true,
      },
    });

    const headers = [
      "Ticket ID",
      "Title",
      "Status",
      "Priority",
      "Project Name",
      "Created Date",
      "Uploaded By Email",
      "Assigned To Email",
      "Resolution Notes"
    ];

    let csvContent = headers.map(escapeCSV).join(",") + "\n";

    for (const ticket of tickets) {
      const row = [
        ticket.id,
        ticket.title,
        ticket.status,
        ticket.priority,
        ticket.project?.name || "",
        ticket.createdAt.toISOString().split("T")[0],
        ticket.createdBy.email || "",
        ticket.assignedTo?.email || "",
        ticket.resolution || ""
      ];
      csvContent += row.map(escapeCSV).join(",") + "\n";
    }

    const fileNameDateStr = `${startDateParam || "all"}_to_${endDateParam || "all"}`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets_export_${fileNameDateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting tickets: ", error);
    return NextResponse.json(
      { error: "Failed to export tickets" },
      { status: 500 },
    );
  }
}
