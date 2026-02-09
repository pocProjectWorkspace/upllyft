'use client';

import { useState } from 'react';
import { Button, Card, Badge, Input } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useCompletionStats,
  useChildProgressTimeline,
  useChildJourney,
} from '@/hooks/use-worksheets';
import { domainLabels, formatShortDate } from '@/lib/utils';

const trendIcons: Record<string, { label: string; color: string; arrow: string }> = {
  improving: { label: 'Improving', color: 'text-green-600', arrow: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  declining: { label: 'Declining', color: 'text-red-600', arrow: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
  stable: { label: 'Stable', color: 'text-blue-600', arrow: 'M5 12h14' },
};

export default function ProgressPage() {
  const [childId, setChildId] = useState('');
  const [activeChildId, setActiveChildId] = useState('');

  const { data: stats, isLoading: statsLoading } = useCompletionStats(activeChildId);
  const { data: timeline, isLoading: timelineLoading } = useChildProgressTimeline(activeChildId);
  const { data: journey, isLoading: journeyLoading } = useChildJourney(activeChildId);

  const isLoading = statsLoading || timelineLoading || journeyLoading;
  const hasData = !!activeChildId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (childId.trim()) setActiveChildId(childId.trim());
  }

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Child Progress & Analytics</h1>
          <p className="text-gray-500 mt-1">
            Track your child&apos;s worksheet completion and developmental progress.
          </p>
        </div>

        {/* Child selector */}
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Child ID</label>
            <Input
              placeholder="Enter child ID..."
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!childId.trim()}>
            Load Progress
          </Button>
        </form>

        {!hasData && !isLoading && (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-900">Enter a child ID to view progress</h3>
            <p className="text-gray-500 mt-1">
              Select a child to see their completion stats, domain progress, and journey.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {hasData && !isLoading && (
          <div className="space-y-8">
            {/* Completion Stats */}
            {stats && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-teal-600">{stats.totalCompleted}</p>
                    <p className="text-sm text-gray-500 mt-1">Completed</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-teal-600">
                      {stats.avgTimeSpent ? `${Math.round(stats.avgTimeSpent)}m` : '--'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Avg Time</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-teal-600">
                      {stats.avgDifficultyRating ? stats.avgDifficultyRating.toFixed(1) : '--'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Avg Difficulty</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-teal-600">
                      {stats.avgEngagementRating ? stats.avgEngagementRating.toFixed(1) : '--'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Avg Engagement</p>
                  </Card>
                </div>
              </div>
            )}

            {/* Domain Progress */}
            {timeline && timeline.domains && timeline.domains.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Progress</h2>
                <div className="space-y-4">
                  {timeline.domains.map((dp) => {
                    const trend = trendIcons[dp.trend] || trendIcons.stable;
                    return (
                      <Card key={dp.domain} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {domainLabels[dp.domain] || dp.domain}
                            </h3>
                            <Badge color={dp.trend === 'improving' ? 'green' : dp.trend === 'declining' ? 'red' : 'blue'}>
                              {trend.label}
                            </Badge>
                          </div>
                          <svg className={`w-5 h-5 ${trend.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.arrow} />
                          </svg>
                        </div>
                        {dp.entries.length > 0 ? (
                          <div className="space-y-2">
                            {dp.entries.slice(0, 5).map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{entry.worksheetTitle}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-400">{formatShortDate(entry.date)}</span>
                                  <span className="font-medium text-gray-900">Score: {entry.score}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No entries yet.</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Journey */}
            {journey && journey.domainProgression && journey.domainProgression.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Learning Journey{' '}
                  <span className="text-sm font-normal text-gray-500">
                    ({journey.completedCount} total completed)
                  </span>
                </h2>
                <div className="space-y-4">
                  {journey.domainProgression.map((dp) => (
                    <Card key={dp.domain} className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        {domainLabels[dp.domain] || dp.domain}
                      </h3>
                      {dp.worksheets.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {dp.worksheets.map((ws) => (
                            <div
                              key={ws.id}
                              className="flex items-center gap-1.5 bg-teal-50 rounded-full px-3 py-1 text-sm"
                            >
                              <span className="text-teal-700 font-medium">{ws.title}</span>
                              {ws.completedAt && (
                                <span className="text-teal-500 text-xs">
                                  {formatShortDate(ws.completedAt)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No worksheets completed in this domain.</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty combined */}
            {!stats && !timeline?.domains?.length && !journey?.domainProgression?.length && (
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-gray-900">No progress data yet</h3>
                <p className="text-gray-500 mt-1">
                  Complete some worksheets to start tracking progress.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
