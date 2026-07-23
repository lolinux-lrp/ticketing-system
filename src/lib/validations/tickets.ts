import { z } from "zod";
import { Priority, Status } from "@prisma/client";

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title should be atleat 2 characters")
    .max(200, "Title too long"),
  description: z
    .string()
    .trim()
    .min(10, "Description should be atleat 10 characters"),
  priority: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.nativeEnum(Priority)).optional(),
  createdById: z.string().uuid("Invalid User ID"),
  projectId: z.string().uuid("Please select a valid project"),
  contactEmail: z.string().email("A valid contact email is required"),
});

export type createTicketInput = z.infer<typeof createTicketSchema>;

export const getTicketSchema = z.object({
  search: z.string().optional(),
  status: z.enum(Status).optional(),
  priority: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.nativeEnum(Priority)).optional(),
  createdById: z.string().uuid("Invalid User ID").optional(),
  projectId: z.string().uuid("Invalid Project ID").optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "priority", "status", "lastActivityAt"]).default("lastActivityAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assignedToId: z.string().optional(),
});

export type getTicketInput = z.infer<typeof getTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  status: z.enum(Status).optional(),
  priority: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.nativeEnum(Priority)).optional(),
  assignedToId: z.string().uuid("Invalid Agent ID").optional().nullable(),
  resolution: z.string().optional(),
});

export type updateTicketInput = z.infer<typeof updateTicketSchema>;
