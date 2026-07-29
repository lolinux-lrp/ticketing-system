import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateMeetingPayload,
  UpdateMeetingPayload,
  MeetingWithAttendees,
} from "@/types/meeting";
import type { MeetingStatus } from "@prisma/client";
import { subscribeToRealtime } from "./realtime";

export type SerializedMeetingWithAttendees = Omit<
  MeetingWithAttendees,
  "createdAt" | "updatedAt" | "startTime" | "endTime"
> & {
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
};

export const meetingsApi = createApi({
  reducerPath: "meetingsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/meetings" }),
  tagTypes: ["Meeting", "Ticket"],
  endpoints: (builder) => ({
    getMeetings: builder.query<{ data: SerializedMeetingWithAttendees[] }, void>({
      query: () => "/",
      providesTags: ["Meeting"],
      async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
        const handler = subscribeToRealtime(
          cacheDataLoaded,
          cacheEntryRemoved,
          (payload) => payload.type === 'TICKET_MUTATED' && (payload.action === 'MEETING_SCHEDULED' || payload.action === 'MEETING_CANCELLED'),
          () => dispatch(meetingsApi.util.invalidateTags(['Meeting']))
        );
        await handler();
      },
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
      invalidatesTags: ["Ticket", "Meeting"],
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
      invalidatesTags: ["Ticket", "Meeting"],
    }),
    deleteMeeting: builder.mutation<{ message: string }, { id: string; ticketId?: string }>({
      query: ({ id }) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Ticket", "Meeting"],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
} = meetingsApi;
