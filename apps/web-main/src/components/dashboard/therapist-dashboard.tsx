'use client';

import type { User } from '@upllyft/types';
import { APP_URLS } from '@upllyft/api-client';
import { Card, Avatar, Badge, Skeleton } from '@upllyft/ui';
import { useTherapistAnalytics, useMyBookings } from '@/hooks/use-dashboard';
import { useMemo } from 'react';

const quickActions = [
  {
    title: 'Case Management',
    href: APP_URLS.cases,
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    color: 'pink',
    gradient: 'bg-gradient-to-br from-pink-500 to-pink-700',
    hoverBorder: 'hover:border-pink-300',
    hoverText: 'group-hover:text-pink-700',
    hoverShadow: 'hover:shadow-[0_12px_24px_-8px_rgba(236,72,153,0.2)]',
  },
  {
    title: 'Manage Availability',
    href: `${APP_URLS.booking}/therapist/availability`,
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'blue',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    hoverBorder: 'hover:border-blue-300',
    hoverText: 'group-hover:text-blue-700',
    hoverShadow: 'hover:shadow-[0_12px_24px_-8px_rgba(59,130,246,0.2)]',
  },
  {
    title: 'Learning Resources',
    href: APP_URLS.resources,
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'purple',
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    hoverBorder: 'hover:border-purple-300',
    hoverText: 'group-hover:text-purple-700',
    hoverShadow: 'hover:shadow-[0_12px_24px_-8px_rgba(139,92,246,0.2)]',
  },
  {
    title: 'Screening Tools',
    href: APP_URLS.screening,
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'teal',
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-700',
    hoverBorder: 'hover:border-teal-300',
    hoverText: 'group-hover:text-teal-700',
    hoverShadow: 'hover:shadow-[0_12px_24px_-8px_rgba(13,148,136,0.2)]',
  },
];

interface TherapistDashboardProps {
  user: User;
}

export function TherapistDashboard({ user }: TherapistDashboardProps) {
  const { data: analytics, isLoading: analyticsLoading } = useTherapistAnalytics();
  const { data: allBookings, isLoading: bookingsLoading } = useMyBookings();

  const displayName = user.name || user.email?.split('@')[0] || 'Therapist';

  const { todaySessions, pendingRequests, upcomingSessions } = useMemo(() => {
    if (!allBookings) return { todaySessions: [], pendingRequests: [], upcomingSessions: [] };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return {
      todaySessions: allBookings.filter(
        (b) =>
          b.status === 'CONFIRMED' &&
          new Date(b.startDateTime) >= todayStart &&
          new Date(b.startDateTime) < todayEnd,
      ),
      pendingRequests: allBookings.filter((b) => b.status === 'PENDING'),
      upcomingSessions: allBookings
        .filter((b) => b.status === 'CONFIRMED' && new Date(b.startDateTime) > now)
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
        .slice(0, 5),
    };
  }, [allBookings]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-gray-600">Here&apos;s your practice overview for today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/80 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-3 border border-teal-200">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">Therapist</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.totalBookings || 0}</p>
                  <p className="text-xs text-gray-500">Total Sessions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics?.totalRevenue ? `$${(analytics.totalRevenue / 100).toFixed(0)}` : '$0'}
                  </p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.averageRating?.toFixed(1) || '--'}</p>
                  <p className="text-xs text-gray-500">Average Rating</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.pendingRequests || 0}</p>
                  <p className="text-xs text-gray-500">Pending Requests</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {pendingRequests.length} pending booking request{pendingRequests.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-600">Requests auto-cancel after 4 hours if not accepted.</p>
            </div>
            <a href={`${APP_URLS.booking}/therapist/bookings`} className="text-sm font-medium text-amber-700 hover:text-amber-800">
              Review
            </a>
          </div>
        </div>
      )}

      {/* Bottom Row: Today's Schedule + Earnings */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Today&apos;s Schedule
              <span className="text-sm font-normal text-gray-500 ml-2">
                {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <a href={`${APP_URLS.booking}/therapist/bookings`} className="text-sm text-teal-600 font-medium">
              View All
            </a>
          </div>
          {bookingsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : todaySessions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {todaySessions.map((session) => {
                const startDate = new Date(session.startDateTime);
                return (
                  <div key={session.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs text-teal-600 font-medium">
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric' })}
                      </span>
                      <span className="text-xs text-teal-700 font-bold">
                        {startDate.toLocaleTimeString('en-US', { minute: '2-digit' }).split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {session.client?.name || session.client?.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.sessionType?.name} · {session.sessionType?.duration}min
                      </p>
                    </div>
                    <Badge color="green">Confirmed</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500">No sessions scheduled for today</p>
            </div>
          )}
        </div>

        {/* Earnings Summary — Dark gradient card matching design system */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-teal-500/20 text-teal-300 text-xs font-medium rounded-full">Earnings</span>
          </div>
          <h3 className="font-semibold text-lg mb-4">Practice Summary</h3>
          {analytics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">
                    ${(analytics.totalRevenue / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">Total Earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {analytics.completionRate ? `${Math.round(analytics.completionRate)}%` : '--'}
                  </p>
                  <p className="text-xs text-gray-400">Completion</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics.upcomingSessions}</p>
                  <p className="text-xs text-gray-400">Upcoming</p>
                </div>
              </div>
              <a
                href={`${APP_URLS.booking}/therapist/earnings`}
                className="block w-full py-3 bg-teal-500 hover:bg-teal-400 rounded-xl font-medium transition-colors text-center"
              >
                View Earnings Details
              </a>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Loading earnings data...</p>
          )}
        </div>
      </div>

      {/* Quick Actions — Module cards matching design system */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <a
              key={action.title}
              href={action.href}
              className={`bg-white rounded-2xl p-6 border border-gray-200 ${action.hoverBorder} group transition-all duration-200 hover:-translate-y-1 ${action.hoverShadow}`}
            >
              <div className={`w-12 h-12 ${action.gradient} rounded-xl flex items-center justify-center mb-4`}>
                {action.icon}
              </div>
              <p className={`font-semibold text-gray-900 mb-1 ${action.hoverText}`}>{action.title}</p>
              <p className="text-sm text-gray-500">
                {action.title === 'Case Management' && 'Manage client cases'}
                {action.title === 'Manage Availability' && 'Set your schedule'}
                {action.title === 'Learning Resources' && 'AI-powered worksheets'}
                {action.title === 'Screening Tools' && 'Assessment tools'}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Upcoming Sessions</h3>
            <a href={`${APP_URLS.booking}/therapist/bookings`} className="text-sm text-teal-600 font-medium">
              View All
            </a>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingSessions.map((session) => {
              const startDate = new Date(session.startDateTime);
              const month = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const day = startDate.getDate();
              return (
                <div key={session.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-blue-600 font-medium">{month}</span>
                    <span className="text-lg text-blue-700 font-bold">{day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {session.client?.name || session.client?.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {session.sessionType?.name}
                    </p>
                  </div>
                  <Badge color="green">Confirmed</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
