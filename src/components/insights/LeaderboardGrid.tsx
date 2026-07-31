import React, { useState } from 'react';
import { LeaderboardEntry } from '@/types/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react';

interface Props {
  data: LeaderboardEntry[];
  isLoading: boolean;
}

type SortField = 'name' | 'resolvedCount' | 'slaCompliancePercentage';
type SortOrder = 'asc' | 'desc';

export function LeaderboardGrid({ data, isLoading }: Props) {
  const [sortField, setSortField] = useState<SortField>('resolvedCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-1 mt-4">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center border-b pb-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-4 w-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = a[sortField] - b[sortField];
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 opacity-20" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <Card className="col-span-full lg:col-span-1 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-muted/80 rounded-tl-lg"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Agent
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('resolvedCount')}
                >
                  <div className="flex items-center gap-1">
                    Resolved
                    {renderSortIcon('resolvedCount')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-muted/80 rounded-tr-lg"
                  onClick={() => handleSort('slaCompliancePercentage')}
                >
                  <div className="flex items-center gap-1">
                    SLA %
                    {renderSortIcon('slaCompliancePercentage')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((entry, index) => (
                <tr
                  key={entry.userId}
                  className="bg-card border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                    {index === 1 && <Trophy className="h-4 w-4 text-gray-400" />}
                    {index === 2 && <Trophy className="h-4 w-4 text-amber-600" />}
                    {index > 2 && <span className="w-4 inline-block text-center text-muted-foreground">{index + 1}.</span>}
                    {entry.name}
                  </td>
                  <td className="px-4 py-3">{entry.resolvedCount}</td>
                  <td className="px-4 py-3">{entry.slaCompliancePercentage.toFixed(1)}%</td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No data available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
