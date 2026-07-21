import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Project } from "@/types";

export interface CreateProjectPayload {
  name: string;
  domains: string[];
  contractStart?: string | null;
  contractEnd?: string | null;
  expirationSubject?: string | null;
  expirationBody?: string | null;
}

export const projectsApi = createApi({
  reducerPath: "projectsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/projects" }),
  tagTypes: ["Project"],
  endpoints: (builder) => ({
    getProjects: builder.query<{ data: Project[] }, void>({
      query: () => "/",
      providesTags: ["Project"],
    }),
    createProject: builder.mutation<{ data: Project }, CreateProjectPayload>({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Project"],
    }),
    updateProject: builder.mutation<{ data: Project }, { id: string; body: CreateProjectPayload }>({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Project"],
    }),
  }),
});

export const { useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation } = projectsApi;
