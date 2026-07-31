export interface VolumeMetrics {
  totalTickets: number;
  resolvedTickets: number;
  backlogCount: number;
  resolutionRatePercentage: number;
}

export interface VelocityMetrics {
  averageResolutionTime: number; // in hours
  timeToFirstResponse: number; // in hours
}

export interface QualityMetrics {
  slaCompliancePercentage: number;
  reopenRatePercentage: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  resolvedCount: number;
  slaCompliancePercentage: number;
}

export interface TrendData {
  date: string;
  created: number;
  resolved: number;
}

export interface InsightsData {
  volume: VolumeMetrics;
  velocity: VelocityMetrics;
  quality: QualityMetrics;
  leaderboard: LeaderboardEntry[];
  trends: TrendData[];
}

export interface GetInsightsQueryParams {
  timeframe?: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  projectId?: string;
  priority?: string;
  userId?: string;
}

