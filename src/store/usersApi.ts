import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    inviteUser: builder.mutation<any, { name: string; email: string; role: "AGENT" | "ADMIN" }>({
      query: (body) => ({
        url: "users/invite",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useInviteUserMutation } = usersApi;
