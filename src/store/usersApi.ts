import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { TicketUser } from "@/types";

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    inviteUser: builder.mutation<unknown, { name: string; email: string; role: "AGENT" | "ADMIN" }>({
      query: (body) => ({
        url: "users/invite",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    getAgents: builder.query<TicketUser[], void>({
      query: () => "users/agents",
      transformResponse: (response: { data: TicketUser[] }) => response.data,
      providesTags: ["User"],
    }),
  }),
});

export const { useInviteUserMutation, useGetAgentsQuery } = usersApi;
