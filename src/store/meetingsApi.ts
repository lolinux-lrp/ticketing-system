import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateMeetingPayload,
  UpdateMeetingPayload,
  MeetingWithAttendees,
} from "@/types/meeting";

export type SerializedMeetingWithAttendees = Omit<
  MeetingWithAttendees,
  "createdAt" | "updatedAt" | "startTime" | "endTime"
> & {
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime: string;
};

export const meetingsApi = createApi({
  reducerPath: "meetingsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/meetings" }),
  tagTypes: ["Meeting", "Ticket"],
  endpoints: (builder) => ({
    getMeetings: builder.query<{ data: SerializedMeetingWithAttendees[] }, void>({
      query: () => "/",
      providesTags: ["Meeting"],
    }),
    createMeeting: builder.mutation<
      { data: SerializedMeetingWithAttendees; error?: string; conflict?: { meetingId: string; startTime: string; endTime: string } },
      CreateMeetingPayload
    >({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => 
        arg.ticketId 
          ? ["Meeting", { type: "Ticket", id: arg.ticketId }] 
          : ["Meeting"],
    }),
    updateMeeting: builder.mutation<
      { data: SerializedMeetingWithAttendees },
      { id: string; body: UpdateMeetingPayload }
    >({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, arg) =>
        arg.body.ticketId
          ? ["Meeting", { type: "Ticket", id: arg.body.ticketId }]
          : ["Meeting"],
    }),
    deleteMeeting: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Meeting"],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
} = meetingsApi;
