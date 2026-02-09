'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  StatCard,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import { useAnalytics } from '@/hooks/use-admin';

const RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState('7d');
  const { toast } = useToast();
  const { data, isLoading } = useAnalytics(range);

  const totalUsers = data?.userGrowth?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const totalPosts = data?.contentStats?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const totalAiCalls = data?.aiUsage?.reduce((sum, d) => sum + d.calls, 0) ?? 0;
  const engagementRate =
    data?.engagementMetrics?.find((m) => m.metric === 'engagement_rate')?.value ?? 0;

  const maxContentCount = Math.max(...(data?.contentStats?.map((c) => c.count) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Platform insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => toast({ title: 'Export started', description: 'Report will be downloaded shortly' })}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-7 w-16 mt-3" />
              <Skeleton className="h-4 w-20 mt-1" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              value={totalUsers.toLocaleString()}
              label="Total Users"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              }
              value={totalPosts.toLocaleString()}
              label="Total Posts"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              value={totalAiCalls.toLocaleString()}
              label="AI Calls"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              value={`${engagementRate.toFixed(1)}%`}
              label="Engagement Rate"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h2>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.userGrowth?.length ? (
            <div className="space-y-2">
              {data.userGrowth.slice(-10).map((d) => {
                const max = Math.max(...data.userGrowth.map((g) => g.count));
                const pct = max > 0 ? (d.count / max) * 100 : 0;
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 flex-shrink-0">
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-10 text-right">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data available</p>
          )}
        </Card>

        {/* Content Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Distribution</h2>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.contentStats?.length ? (
            <div className="space-y-4">
              {data.contentStats.map((c) => (
                <div key={c.type}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600 capitalize">{c.type.toLowerCase().replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">{c.count.toLocaleString()}</span>
                  </div>
                  <Progress value={maxContentCount > 0 ? (c.count / maxContentCount) * 100 : 0} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data available</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Posts</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.topPosts ?? []).map((post, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]">
                      {post.title}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{post.author}</TableCell>
                    <TableCell className="text-right">
                      <Badge color="teal">{post.views.toLocaleString()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.topPosts?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-4">
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* AI Feature Usage */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Feature Usage</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">API Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.aiUsage ?? []).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm capitalize">
                      {item.feature.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge color="blue">{item.calls.toLocaleString()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.aiUsage?.length && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-400 py-4">
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Engagement Metrics */}
      {data?.engagementMetrics && data.engagementMetrics.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.engagementMetrics.map((m) => (
              <div key={m.metric} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 capitalize">
                  {m.metric.replace(/_/g, ' ')}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {m.metric.includes('rate') || m.metric.includes('ratio')
                    ? `${m.value.toFixed(1)}%`
                    : m.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
