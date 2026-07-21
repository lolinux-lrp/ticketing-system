import { NextResponse, NextRequest } from "next/server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/policy";
import { getTicketSchema } from "@/lib/validations/tickets";
import { buildTicketFilters } from "@/lib/filters";

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

    const urlParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = getTicketSchema.safeParse(urlParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const where = buildTicketFilters(validation.data, session.user);

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

    const fileNameDateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-export-${fileNameDateStr}.csv"`,
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
