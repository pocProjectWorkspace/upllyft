'use client';

import { Card } from '@upllyft/ui';
import { type ContributionStatsData } from '@/lib/api/profiles';

interface ContributionStatsProps {
  stats: ContributionStatsData;
  onFollowerClick?: () => void;
  onFollowingClick?: () => void;
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'posts' as const,
    label: 'Posts',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'questionsAnswered' as const,
    label: 'Answers',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'resourcesShared' as const,
    label: 'Resources',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    key: 'upvotesReceived' as const,
    label: 'Upvotes',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    key: 'followers' as const,
    label: 'Followers',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'following' as const,
    label: 'Following',
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function ContributionStats({ stats, onFollowerClick, onFollowingClick, className }: ContributionStatsProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className || ''}`}>
      {STAT_ITEMS.map((item) => {
        const isClickable =
          (item.key === 'followers' && onFollowerClick) ||
          (item.key === 'following' && onFollowingClick);
        const onClick =
          item.key === 'followers' ? onFollowerClick : item.key === 'following' ? onFollowingClick : undefined;

        return (
          <Card
            key={item.key}
            className={`p-4 ${isClickable ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
            onClick={onClick}
          >
            <div className={`rounded-lg p-2.5 mb-2 w-fit ${item.bg}`}>
              <span className={item.color}>{item.icon}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{stats[item.key].toLocaleString()}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </Card>
        );
      })}
    </div>
  );
}
