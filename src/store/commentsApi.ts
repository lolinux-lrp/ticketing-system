import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { CreateCommentPayload, Comment } from "@/types";

export const commentsApi = createApi({
  reducerPath: "commentsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Comment"],
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
      invalidatesTags: [{ type: "Comment", id: "LIST" }],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          const { ticketsApi } = await import("@/store/ticketsApi");
          dispatch(ticketsApi.util.invalidateTags([{ type: "Ticket", id: arg.ticketId }]));
        } catch {}
      }
    }),

    deleteComment: builder.mutation<Comment, { commentId: string; ticketId: string }>({
      query: ({ commentId }) => ({
        url: `/comments?id=${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Comment", id: arg.commentId },
        { type: "Comment", id: "LIST" },
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          const { ticketsApi } = await import("@/store/ticketsApi");
          dispatch(ticketsApi.util.invalidateTags([{ type: "Ticket", id: arg.ticketId }]));
        } catch {}
      }
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;