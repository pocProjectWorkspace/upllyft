'use client';

import React from 'react';
import { Badge } from '@upllyft/ui';

interface BadgeDisplayProps {
  badges: string[];
  className?: string;
}

const BADGE_CONFIG: Record<string, { color: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'; icon: React.ReactNode }> = {
  Verified: {
    color: 'green',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  Expert: {
    color: 'purple',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  Star: {
    color: 'yellow',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  Veteran: {
    color: 'red',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
};

function getBadgeConfig(badge: string) {
  if (badge.includes('Verified')) return BADGE_CONFIG.Verified;
  if (badge.includes('Expert') || badge.includes('Specialist')) return BADGE_CONFIG.Expert;
  if (badge.includes('Star') || badge.includes('Popular')) return BADGE_CONFIG.Star;
  if (badge.includes('Veteran') || badge.includes('Experienced')) return BADGE_CONFIG.Veteran;
  return { color: 'blue' as const, icon: BADGE_CONFIG.Expert.icon };
}

function cleanBadgeText(text: string) {
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

export function BadgeDisplay({ badges, className }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {badges.map((badge, idx) => {
        const config = getBadgeConfig(badge);
        return (
          <Badge key={idx} color={config.color}>
            <span className="inline-flex items-center gap-1">
              {config.icon}
              {cleanBadgeText(badge)}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
