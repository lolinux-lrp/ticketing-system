import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  TicketUser,
  CreateTicketPayload,
  DeleteTicketResponse,
  GetTicketsParams,
  Ticket,
  UpdateTicketPayload,
} from "@/types";

interface GetTicketsResponse {
  data: Ticket[];
}

export const ticketsApi = createApi({
  reducerPath: "ticketsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Ticket"],
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
        { type: "Ticket", id: "LIST" },
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
    getTicket: builder.query<{ ticket: Ticket & { comments: any[] } }, string>({
      query: (id) => `tickets/${id}`,
      providesTags: (result, error, id) => [{ type: "Ticket", id }],
    }),
    addComment: builder.mutation<any, { ticketId: string; content: string }>({
      query: ({ ticketId, content }) => ({
        url: `tickets/${ticketId}/comments`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (result, error, { ticketId }) => [
        { type: "Ticket", id: ticketId },
      ],
    }),
    getAgents: builder.query<TicketUser[], void>({
      query: () => "users/agents",
      transformResponse: (response: { data: TicketUser[] }) => response.data,
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useAddCommentMutation,
  useGetAgentsQuery,
} = ticketsApi;
