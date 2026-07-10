import { z } from "zod";
import { AttendeeStatus } from "@prisma/client";

export const createMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().trim().optional(),
  /** UTC ISO-8601 string */
  startTime: z
    .string()
    .datetime({ message: "startTime must be a valid UTC ISO-8601 datetime" }),
  /** UTC ISO-8601 string */
  endTime: z
    .string()
    .datetime({ message: "endTime must be a valid UTC ISO-8601 datetime" }),
  ticketId: z.string().optional(),
  /** Non-host attendee user IDs */
  attendeeIds: z
    .array(z.string())
    .min(0)
    .default([]),
  /** Optional array of teammate user IDs to invite */
  teammateIds: z.array(z.string()).optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().optional(),
  startTime: z
    .string()
    .datetime({ message: "startTime must be a valid UTC ISO-8601 datetime" })
    .optional(),
  endTime: z
    .string()
    .datetime({ message: "endTime must be a valid UTC ISO-8601 datetime" })
    .optional(),
  ticketId: z.string().nullable().optional(),
  attendeeIds: z.array(z.string()).optional(),
  /** Attendee-level RSVP status update */
  attendeeStatus: z.enum(AttendeeStatus).optional(),
});

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
