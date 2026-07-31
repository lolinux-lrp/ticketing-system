import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { InsightsData } from "@/types";

export interface GetInsightsParams {
  timeframe?: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

export const insightsApi = createApi({
  reducerPath: "insightsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Analytics"],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getInsights: builder.query<{ data: InsightsData }, GetInsightsParams | void>({
      query: (params) => ({
        url: "insights",
        params: params ?? undefined,
      }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetInsightsQuery } = insightsApi;
