import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { TicketUser } from "@/types";

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    inviteUser: builder.mutation<unknown, { name: string; email: string; role: "USER" | "ADMIN" }>({
      query: (body) => ({
        url: "users/invite",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    getStandardUsers: builder.query<TicketUser[], { search?: string; status?: string } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.status) queryParams.append("status", params.status);
        const queryString = queryParams.toString();
        return `users/standard${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: { data: TicketUser[] }) => response.data,
      providesTags: ["User"],
    }),
    deactivateUser: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    reactivateUser: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `users/${id}/reactivate`,
        method: "PATCH",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useInviteUserMutation, useGetStandardUsersQuery, useDeactivateUserMutation, useReactivateUserMutation } = usersApi;
