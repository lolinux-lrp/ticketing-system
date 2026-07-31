import { prisma } from "@/lib/prisma";
import { parseInsightsFilters } from "@/lib/insights-filters";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { error: filterError, status, filters } = await parseInsightsFilters(req);
    if (filterError || !filters) {
      return new Response(filterError || "Internal Server Error", { status: status || 500 });
    }
    const { baseWhere } = filters;

    const tickets = await prisma.ticket.findMany({
      where: baseWhere,
      take: 5000,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        assignedTo: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      }
    });

    // CSV Header
    let csvString = "ID,Title,Status,Priority,Created At,Resolved At,Assignee Name,Assignee Email\n";

    // Helper to sanitize CSV fields
    const sanitizeCsvField = (value: string) => {
      if (!value) return '""';
      
      // Remove embedded newlines and trim whitespace
      let cleanValue = value.replace(/[\n\r]+/g, ' ').trim();
      
      // CSV Injection Prevention
      if (/^[=+\-@\t\r]/.test(cleanValue)) {
        cleanValue = "'" + cleanValue;
      }
      
      // Escape quotes
      cleanValue = cleanValue.replace(/"/g, '""');
      return `"${cleanValue}"`;
    };

    // Map each ticket to a CSV row
    tickets.forEach(ticket => {
      const row = [
        ticket.id,
        sanitizeCsvField(ticket.title || ""),
        ticket.status,
        ticket.priority,
        ticket.createdAt.toISOString(),
        ticket.resolvedAt ? ticket.resolvedAt.toISOString() : "",
        sanitizeCsvField(ticket.assignedTo?.name || "Unassigned"),
        sanitizeCsvField(ticket.assignedTo?.email || "N/A")
      ];
      
      csvString += row.join(",") + "\n";
    });

    const headers: HeadersInit = {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="tickets-export.csv"'
    };

    if (tickets.length === 5000) {
      headers["X-Data-Truncated"] = "true";
    }

    return new Response(csvString, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Insights Export API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
