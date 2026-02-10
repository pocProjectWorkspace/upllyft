'use client';

import type { User } from '@upllyft/types';
import { APP_URLS } from '@upllyft/api-client';
import { Card, Avatar, Badge, Skeleton } from '@upllyft/ui';
import { useMyProfile, useUpcomingBookings, useRecentFeedPosts } from '@/hooks/use-dashboard';
import { calculateAge } from '@/lib/api/profiles';
import { useState } from 'react';

interface ParentDashboardProps {
  user: User;
}

export function ParentDashboard({ user }: ParentDashboardProps) {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: upcomingSessions, isLoading: sessionsLoading } = useUpcomingBookings();
  const { data: recentPosts, isLoading: feedLoading } = useRecentFeedPosts();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const children = profile?.children || [];
  const selectedChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId)
    : children[0];

  const displayName = user.name || user.email?.split('@')[0] || 'Parent';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-gray-600">
              {selectedChild
                ? `Here's how ${selectedChild.firstName} is progressing across all areas`
                : "Here's what's happening with your children's progress"}
            </p>
          </div>
          {selectedChild && (
            <div
              className="bg-white/80 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-3 border border-teal-200 cursor-pointer"
              onClick={() => {
                if (children.length <= 1) return;
                const idx = children.findIndex((c) => c.id === selectedChild.id);
                const next = children[(idx + 1) % children.length];
                setSelectedChildId(next.id);
              }}
            >
              <Avatar name={selectedChild.firstName} size="md" />
              <div>
                <p className="font-semibold text-gray-900">{selectedChild.firstName}</p>
                <p className="text-xs text-gray-500">
                  Age {calculateAge(selectedChild.dateOfBirth)} years
                  {selectedChild.grade ? ` \u00b7 Grade ${selectedChild.grade}` : ''}
                </p>
              </div>
              {children.length > 1 && (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {profileLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{children.length}</p>
                  <p className="text-xs text-gray-500">Children</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{upcomingSessions?.length || 0}</p>
                  <p className="text-xs text-gray-500">Sessions This Week</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedChild?.conditions?.length || 0}</p>
                  <p className="text-xs text-gray-500">Active Conditions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile?.completenessScore ? `${profile.completenessScore}%` : '--'}
                  </p>
                  <p className="text-xs text-gray-500">Profile Completion</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Module Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a
          href={APP_URLS.screening}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-teal-300 group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(13,148,136,0.2)]"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-teal-500 to-teal-700">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-700">Screening</h3>
          <p className="text-sm text-gray-500">Track developmental milestones</p>
        </a>

        <a
          href={APP_URLS.booking}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(59,130,246,0.2)]"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-blue-500 to-blue-700">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700">Book Session</h3>
          <p className="text-sm text-gray-500">Schedule therapy sessions</p>
        </a>

        <a
          href={APP_URLS.resources}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-300 group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(139,92,246,0.2)]"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-purple-500 to-purple-700">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-700">Learning</h3>
          <p className="text-sm text-gray-500">AI-powered worksheets</p>
        </a>

        <a
          href={APP_URLS.community}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-pink-300 group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(236,72,153,0.2)]"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-pink-500 to-pink-700">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-pink-700">Community</h3>
          <p className="text-sm text-gray-500">Connect with other parents</p>
        </a>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Upcoming Sessions</h3>
            <a href={APP_URLS.booking} className="text-sm text-teal-600 font-medium hover:text-teal-700">
              View All
            </a>
          </div>
          {sessionsLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : upcomingSessions && upcomingSessions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {upcomingSessions.slice(0, 3).map((session) => {
                const dt = new Date(session.startDateTime);
                const month = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = dt.getDate();
                return (
                  <div key={session.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-blue-600 font-medium">{month}</span>
                      <span className="text-lg text-blue-700 font-bold leading-none">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{session.sessionType?.name || 'Session'}</p>
                      <p className="text-sm text-gray-500">
                        {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {' \u2022 '}
                        {session.therapist?.user?.name || 'Therapist'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Confirmed
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">No upcoming sessions</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-teal-500/20 text-teal-300 text-xs font-medium rounded-full">
              AI Powered
            </span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Clinical Insights</h3>
          <p className="text-gray-400 text-sm mb-4">
            Get AI-powered analysis based on
            {selectedChild ? ` ${selectedChild.firstName}'s` : " your child's"} screening results and progress data
          </p>
          <a
            href={APP_URLS.resources}
            className="block w-full py-3 bg-teal-500 hover:bg-teal-400 rounded-xl font-medium transition-colors text-center"
          >
            Get Personalized Insights
          </a>
        </div>
      </div>

      {/* Recent Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Feed</h2>
          <a href="/feed" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            View All
          </a>
        </div>
        {feedLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : recentPosts && recentPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {recentPosts.map((post) => (
              <a key={post.id} href="/feed" className="block">
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <Avatar name={post.author?.name || 'User'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {post.author?.name} {'\u00b7'} {post.upvotes} upvotes {'\u00b7'} {post.commentCount || 0} comments
                      </p>
                      <Badge color="gray" className="mt-2">{post.type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-sm text-gray-500 mb-2">No recent posts</p>
            <a href="/feed" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Go to Feed
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
