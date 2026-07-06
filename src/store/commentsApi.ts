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
    }),

    deleteComment: builder.mutation<Comment, string>({
      query: (commentId) => ({
        url: `/comments?id=${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Comment", id },
        { type: "Comment", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;