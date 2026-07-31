import React from 'react';
import { VolumeMetrics, VelocityMetrics, QualityMetrics } from '@/types/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Zap, Ticket } from 'lucide-react';

interface Props {
  volume: VolumeMetrics;
  velocity: VelocityMetrics;
  quality: QualityMetrics;
  isLoading: boolean;
}

export function VolumeVelocityCards({ volume, velocity, quality, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{volume.totalTickets}</div>
          <p className="text-xs text-muted-foreground">
            {volume.backlogCount} currently open
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{volume.resolutionRatePercentage.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {volume.resolvedTickets} tickets resolved
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{velocity.averageResolutionTime.toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground">
            {velocity.timeToFirstResponse.toFixed(1)}h avg first response
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{quality.slaCompliancePercentage.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Goal: &gt;90%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
