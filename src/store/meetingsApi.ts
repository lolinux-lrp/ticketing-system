import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateMeetingPayload,
  UpdateMeetingPayload,
  MeetingWithAttendees,
} from "@/types/meeting";

export const meetingsApi = createApi({
  reducerPath: "meetingsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/meetings" }),
  tagTypes: ["Meeting", "Ticket"],
  endpoints: (builder) => ({
    getMeetings: builder.query<{ data: MeetingWithAttendees[] }, void>({
      query: () => "/",
      providesTags: ["Meeting"],
    }),
    createMeeting: builder.mutation<
      { data: MeetingWithAttendees; error?: string; conflict?: { meetingId: string; startTime: string; endTime: string } },
      CreateMeetingPayload
    >({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Meeting", "Ticket"],
    }),
    updateMeeting: builder.mutation<
      { data: MeetingWithAttendees },
      { id: string; body: UpdateMeetingPayload }
    >({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Meeting", "Ticket"],
    }),
    deleteMeeting: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Meeting", "Ticket"],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
} = meetingsApi;
