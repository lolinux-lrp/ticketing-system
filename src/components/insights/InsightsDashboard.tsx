"use client";

import React, { useState } from 'react';
import { useGetInsightsQuery, useGetDeepDiveTicketsQuery } from '@/store/insightsApi';
import { VolumeVelocityCards } from './VolumeVelocityCards';
import { TrendChart } from './TrendChart';
import { LeaderboardGrid } from './LeaderboardGrid';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { GetInsightsQueryParams } from '@/types';
import { DetailsDrawer } from './DetailsDrawer';
import Link from 'next/link';

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

  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [drawerPage, setDrawerPage] = useState(1);

  const { data: response, isLoading, error } = useGetInsightsQuery(params);

  const insightsData = response?.data;

  // Data fetching for details drawer
  const deepDiveParams: GetInsightsQueryParams = {
    ...params,
    page: drawerPage,
  };

  if (activeMetric === 'resolved' || activeMetric === 'velocity' || activeMetric === 'sla') {
    deepDiveParams.status = "RESOLVED";
    if (activeMetric === 'velocity' || activeMetric === 'sla') {
      deepDiveParams.metric = activeMetric;
    }
  }

  const { data: detailsResponse, isFetching: isDetailsFetching, isError: isDetailsError } = useGetDeepDiveTicketsQuery(deepDiveParams, { skip: !activeMetric });

  const getMetricTitle = () => {
    switch (activeMetric) {
      case 'total': return 'Total Tickets';
      case 'resolved': return 'Resolved Tickets';
      case 'velocity': return 'Tickets (Avg Resolution Time)';
      case 'sla': return 'SLA Compliant Tickets (Resolved)';
      default: return 'Details';
    }
  };

  const handleCardClick = (metric: string) => {
    setActiveMetric(metric);
    setDrawerPage(1);
  };

  const handleDrawerClose = () => {
    setActiveMetric(null);
    setDrawerPage(1);
  };

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
            onCardClick={handleCardClick}
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

      <DetailsDrawer
        isOpen={!!activeMetric}
        onClose={handleDrawerClose}
        title={getMetricTitle()}
      >
        {isDetailsFetching ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
          </div>
        ) : isDetailsError ? (
          <div className="p-6 m-4 rounded-2xl flex flex-col items-center justify-center space-y-2 text-red-500 bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Failed to load tickets</p>
            <p className="text-sm opacity-80">
              An error occurred while fetching the ticket details.
            </p>
          </div>
        ) : detailsResponse?.data && detailsResponse.data.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--surface-2)]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Ticket</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3 rounded-tr-lg">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsResponse.data.map(ticket => (
                    <tr key={ticket.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        <Link href={`/tickets/${ticket.id}`} className="hover:underline text-[var(--brand)] truncate block max-w-[200px]">
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-[var(--surface-3)]">
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-[var(--surface-3)]">
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detailsResponse.meta && detailsResponse.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-[var(--border)]">
                <button
                  onClick={() => setDrawerPage(p => Math.max(1, p - 1))}
                  disabled={detailsResponse.meta.page <= 1}
                  className="px-3 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded disabled:opacity-50 text-[var(--text-primary)]"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--text-muted)]">
                  Page {detailsResponse.meta.page} of {detailsResponse.meta.totalPages}
                </span>
                <button
                  onClick={() => setDrawerPage(p => Math.min(detailsResponse.meta.totalPages, p + 1))}
                  disabled={detailsResponse.meta.page >= detailsResponse.meta.totalPages}
                  className="px-3 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded disabled:opacity-50 text-[var(--text-primary)]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 text-[var(--text-muted)]">
            No tickets found for this metric.
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}
