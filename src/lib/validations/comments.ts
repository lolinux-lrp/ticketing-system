import { z } from "zod";

export const createCommentSchema = z.object({

  ticketId: z
    .string({ error: "Ticket ID is required." })
    .uuid("Invalid Ticket ID format."),

  authorId: z
    .string({ error: "Author ID is required." })
    .uuid("Invalid Author ID format."),

  content: z
    .string({ error: "Comment content is required." })
    .trim()
    .min(2, "Comment must be at least 2 characters long.")
    .max(5000, "Comment cannot exceed 5,000 characters.")
    .refine(
      (val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val),
      { message: "HTML script tags are not permitted." }
    ),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const getCommentSchema = z.object({
  ticketId: z
    .string({ error: "Comment ID is required." })
    .uuid("Invalid Comment ID format."),
});

export type GetContentInput = z.infer<typeof getCommentSchema>;

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Comment must be at least 2 characters long.")
    .max(3000, "Comment cannot exceed 3,000 characters.")
    .refine(
      (val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val),
      { message: "HTML script tags are not permitted." }
    ),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const deleteCommentSchema = z.object({
  id: z
    .string({ error: "Comment ID is required." })
    .uuid("Invalid Comment ID format."),
});

export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;