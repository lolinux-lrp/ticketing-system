import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateTicketPayload,
  DeleteTicketResponse,
  GetTicketsParams,
  Ticket,
  UpdateTicketPayload,
} from "@/types";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface GetProjectsResponse {
  data: Project[];
}

interface GetTicketsResponse {
  data: Ticket[];
}

export const ticketsApi = createApi({
  reducerPath: "ticketsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Ticket"],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTickets: builder.query<Ticket[], GetTicketsParams | void>({
      query: (params) => ({
        url: "tickets",
        params: params ?? undefined,
      }),
      transformResponse: (response: GetTicketsResponse) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Ticket" as const, id })),
              { type: "Ticket" as const, id: "LIST" },
            ]
          : [{ type: "Ticket" as const, id: "LIST" }],
    }),
    createTicket: builder.mutation<Ticket, CreateTicketPayload>({
      query: (body) => ({
        url: "tickets",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Ticket", id: "LIST" }],
    }),
    updateTicket: builder.mutation<
      Ticket,
      { id: string; body: UpdateTicketPayload }
    >({
      query: ({ id, body }) => ({
        url: `tickets/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Ticket", id },
      ],
    }),
    deleteTicket: builder.mutation<DeleteTicketResponse, string>({
      query: (id) => ({
        url: `tickets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Ticket", id },
        { type: "Ticket", id: "LIST" },
      ],
    }),
    getTicket: builder.query<{ ticket: Ticket }, string>({
      query: (id) => `tickets/${id}`,
      providesTags: (result, error, id) => [{ type: "Ticket", id }],
    }),
    getProjects: builder.query<Project[], void>({
      query: () => "projects",
      transformResponse: (response: GetProjectsResponse) => response.data,
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useGetProjectsQuery,
} = ticketsApi;
