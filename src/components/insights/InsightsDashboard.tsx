"use client";

import React from 'react';
import { useGetInsightsQuery } from '@/store/insightsApi';
import { VolumeVelocityCards } from './VolumeVelocityCards';
import { TrendChart } from './TrendChart';
import { LeaderboardGrid } from './LeaderboardGrid';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { GetInsightsQueryParams } from '@/types';

interface InsightsDashboardProps {
  userId?: string;
}

export function InsightsDashboard({ userId }: InsightsDashboardProps) {
  const searchParams = useSearchParams();

  const timeframe = (searchParams.get("timeframe") as GetInsightsQueryParams["timeframe"]) || "month";
  const priority = searchParams.get("priority") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const params: GetInsightsQueryParams = { 
    timeframe,
    ...(priority && priority !== "all" ? { priority } : {}),
    ...(projectId && projectId !== "all" ? { projectId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(userId ? { userId } : {}),
  };

  const { data: response, isLoading, error } = useGetInsightsQuery(params);

  const insightsData = response?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Insights & Analytics
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Track your support metrics, team performance, and ticket volume over time.
        </p>
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
            <div className={userId ? "lg:col-span-3" : "lg:col-span-2"}>
              <TrendChart data={insightsData?.trends ?? []} isLoading={isLoading} />
            </div>
            {!userId && (
              <div className="lg:col-span-1">
                <LeaderboardGrid data={insightsData?.leaderboard ?? []} isLoading={isLoading} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
