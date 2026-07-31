import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { InsightsData, GetInsightsQueryParams } from "@/types";

export const insightsApi = createApi({
  reducerPath: "insightsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Analytics"],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getInsights: builder.query<{ data: InsightsData }, GetInsightsQueryParams | void>({
      query: (params) => ({
        url: "insights",
        params: params ?? undefined,
      }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetInsightsQuery } = insightsApi;
