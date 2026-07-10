import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { CreateCommentPayload, Comment } from "@/types";

export const commentsApi = createApi({
  reducerPath: "commentsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Comment", "Ticket"],
  endpoints: (builder) => ({
    getComments: builder.query<Comment[], string>({
      query: (ticketId) => `/comments?ticketId=${ticketId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Comment" as const, id })),
              { type: "Comment", id: "LIST" },
            ]
          : [{ type: "Comment", id: "LIST" }],
    }),

    createComment: builder.mutation<Comment, CreateCommentPayload>({
      query: (payload) => ({
        url: "/comments",
        method: "POST",
        body: payload,
      }),

      invalidatesTags: (result, error, arg) => [
        { type: "Comment", id: "LIST" },
        { type: "Ticket", id: arg.ticketId },
      ],
    }),

    deleteComment: builder.mutation<Comment, { commentId: string; ticketId: string }>({
      query: ({ commentId }) => ({
        url: `/comments?id=${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Comment", id: arg.commentId },
        { type: "Comment", id: "LIST" },
        { type: "Ticket", id: arg.ticketId },
      ],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;