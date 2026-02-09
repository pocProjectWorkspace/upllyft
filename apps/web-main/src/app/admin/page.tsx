'use client';

import { Card, StatCard, Badge, Skeleton } from '@upllyft/ui';
import {
  useAdminStats,
  useEngagementStats,
  useModerationStats,
  useUserDistribution,
  useRecentActivity,
} from '@/hooks/use-admin';

function StatsIcon({ type }: { type: 'users' | 'communities' | 'active' | 'orgs' }) {
  const paths: Record<string, string> = {
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    communities: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    active: 'M13 10V3L4 14h7v7l9-11h-7z',
    orgs: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[type]} />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: engagement, isLoading: engLoading } = useEngagementStats();
  const { data: moderation, isLoading: modLoading } = useModerationStats();
  const { data: distribution } = useUserDistribution();
  const { data: activity } = useRecentActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and key metrics</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-7 w-20 mt-3" />
              <Skeleton className="h-4 w-28 mt-1" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={<StatsIcon type="users" />}
              value={stats?.totalUsers?.toLocaleString() ?? '—'}
              label="Total Users"
            />
            <StatCard
              icon={<StatsIcon type="active" />}
              value={engagement?.dau?.toLocaleString() ?? '—'}
              label="Daily Active Users"
            />
            <StatCard
              icon={<StatsIcon type="orgs" />}
              value={stats?.totalOrganizations?.toLocaleString() ?? '—'}
              label="Organizations"
            />
            <StatCard
              icon={<StatsIcon type="communities" />}
              value={`${stats?.storageUsed ?? 0}%`}
              label="Storage Used"
            />
          </>
        )}
      </div>

      {/* Engagement + Moderation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement (Last 7 Days)</h2>
          {engLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Users</span>
                <span className="text-sm font-semibold text-gray-900">
                  {engagement?.newUsersLast7Days?.toLocaleString() ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Posts</span>
                <span className="text-sm font-semibold text-gray-900">
                  {engagement?.postsLast7Days?.toLocaleString() ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Comments</span>
                <span className="text-sm font-semibold text-gray-900">
                  {engagement?.commentsLast7Days?.toLocaleString() ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">DAU/MAU Ratio</span>
                <span className="text-sm font-semibold text-gray-900">
                  {engagement?.dauMauRatio?.toFixed(1) ?? 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Questions</span>
                <span className="text-sm font-semibold text-gray-900">
                  {engagement?.totalQuestions?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
          {modLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <a
                href="/admin/verification"
                className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">Pending Verifications</span>
                </div>
                <Badge color="yellow">{moderation?.pendingVerifications ?? 0}</Badge>
              </a>
              <a
                href="/admin/content"
                className="flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Flagged Content</span>
                </div>
                <Badge color="red">{moderation?.totalFlagged ?? 0}</Badge>
              </a>
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">System Health</span>
                </div>
                <Badge color="green">OK</Badge>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* User Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h2>
          {distribution ? (
            <div className="space-y-3">
              {distribution.map((d) => {
                const total = distribution.reduce((sum, item) => sum + item.count, 0);
                const pct = total > 0 ? (d.count / total) * 100 : 0;
                return (
                  <div key={d.role}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{d.role.toLowerCase()}</span>
                      <span className="font-medium text-gray-900">{d.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activity ? (
            <div className="space-y-3">
              {activity.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      item.type === 'flag'
                        ? 'bg-red-400'
                        : item.type === 'user'
                          ? 'bg-teal-400'
                          : 'bg-blue-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.description}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
