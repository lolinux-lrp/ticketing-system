import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateTicketPayload,
  CreateTicketMessagePayload,
  DeleteTicketResponse,
  GetTicketsParams,
  Ticket,
  TicketMessage,
  UpdateTicketPayload,
} from "@/types";
import { subscribeToRealtime } from "./realtime";

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
  totalCount: number;
}

export const ticketsApi = createApi({
  reducerPath: "ticketsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Ticket", "Meeting", "Messages", "Dashboard"],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTickets: builder.query<{ data: Ticket[]; totalCount: number }, GetTicketsParams | void>({
      query: (params) => ({
        url: "tickets",
        params: params ?? undefined,
      }),
      transformResponse: (response: GetTicketsResponse) => response,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "Ticket" as const, id })),
              { type: "Ticket" as const, id: "LIST" },
            ]
          : [{ type: "Ticket" as const, id: "LIST" }],
      async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
        const handler = subscribeToRealtime(
          cacheDataLoaded,
          cacheEntryRemoved,
          (payload) => payload.type === 'TICKET_CREATED' || payload.type === 'TICKET_DELETED' || payload.type === 'TICKET_MUTATED',
          () => dispatch(ticketsApi.util.invalidateTags(['Ticket', 'Dashboard']))
        );
        await handler();
      },
    }),
    createTicket: builder.mutation<Ticket, CreateTicketPayload>({
      query: (body) => ({
        url: "tickets",
        method: "POST",
        body,
      }),
      invalidatesTags: ['Ticket', 'Meeting', 'Messages', 'Dashboard'],
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
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedTicket } = await queryFulfilled;
          dispatch(
            ticketsApi.util.updateQueryData("getTicket", id, (draft) => {
              Object.assign(draft.ticket, updatedTicket);
              // Explicitly sync resolvedAt based on the status transition so the
              // cache is always correct regardless of what the server response contains.
              if (body.status === "OPEN" || body.status === "IN_PROGRESS") {
                draft.ticket.resolvedAt = null;
              } else if (body.status === "RESOLVED") {
                // Always stamp the current time — this ensures re-resolving a ticket
                // always shows the latest resolution timestamp, not a cached old one.
                // The invalidatesTags refetch will overwrite with the server's exact value.
                draft.ticket.resolvedAt = new Date().toISOString();
              }
            }),
          );
        } catch {
          // mutation failed — invalidation will trigger a fresh refetch
        }
      },
      invalidatesTags: ['Ticket', 'Meeting', 'Messages', 'Dashboard'],
    }),
    deleteTicket: builder.mutation<DeleteTicketResponse, string>({
      query: (id) => ({
        url: `tickets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Ticket', 'Meeting', 'Messages', 'Dashboard'],
    }),
    getTicket: builder.query<{ ticket: Ticket }, string>({
      query: (id) => `tickets/${id}`,
      providesTags: (result, error, id) => [{ type: "Ticket", id }],
      async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
        const handler = subscribeToRealtime(
          cacheDataLoaded,
          cacheEntryRemoved,
          (payload) => (payload.type === 'TICKET_MUTATED' || payload.type === 'TICKET_DELETED') && payload.ticketId === arg,
          () => dispatch(ticketsApi.util.invalidateTags([{ type: 'Ticket', id: arg }, 'Messages', 'Meeting']))
        );
        await handler();
      },
    }),
    createTicketMessage: builder.mutation<
      TicketMessage,
      { id: string; body: CreateTicketMessagePayload }
    >({
      query: ({ id, body }) => ({
        url: `tickets/${id}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: ['Ticket', 'Meeting', 'Messages', 'Dashboard'],
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
  useCreateTicketMessageMutation,
} = ticketsApi;
