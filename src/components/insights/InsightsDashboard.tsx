"use client";

import React, { useState } from 'react';
import { useGetInsightsQuery, GetInsightsParams } from '@/store/insightsApi';
import { VolumeVelocityCards } from './VolumeVelocityCards';
import { TrendChart } from './TrendChart';
import { LeaderboardGrid } from './LeaderboardGrid';
import { AlertCircle } from 'lucide-react';

type TimeframeOption = "today" | "week" | "month" | "custom";

export function InsightsDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');

  // We can add custom date pickers later for 'custom', for now we pass timeframe
  const params: GetInsightsParams = { timeframe };

  const { data: response, isLoading, error } = useGetInsightsQuery(params);

  const insightsData = response?.data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Insights & Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Track your support metrics, team performance, and ticket volume over time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="timeframe" className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Timeframe:
          </label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
            className="input-base px-3 py-1.5 text-sm w-32 bg-[var(--surface-1)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--brand)]"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            {/* Custom option UI omitted for simplicity, but handled by API */}
            <option value="custom" disabled>Custom</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-6 rounded-2xl flex flex-col items-center justify-center space-y-2 text-red-500 bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-8 w-8" />
          <p className="font-semibold">Failed to load insights</p>
          <p className="text-sm opacity-80">
            {/* @ts-expect-error type narrowing */}
            {error?.data?.error || "An unknown error occurred while fetching analytics."}
          </p>
        </div>
      ) : (
        <>
          <VolumeVelocityCards
            volume={insightsData?.volume ?? { totalTickets: 0, resolvedTickets: 0, backlogCount: 0, resolutionRatePercentage: 0 }}
            velocity={insightsData?.velocity ?? { averageResolutionTime: 0, timeToFirstResponse: 0 }}
            quality={insightsData?.quality ?? { slaCompliancePercentage: 0, reopenRatePercentage: 0 }}
            isLoading={isLoading}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrendChart data={insightsData?.trends ?? []} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-1">
              <LeaderboardGrid data={insightsData?.leaderboard ?? []} isLoading={isLoading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
