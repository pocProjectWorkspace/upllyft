'use client';

import { APP_URLS } from '@upllyft/api-client';
import type { RelevantCommunity } from '@/lib/api/insights';

interface CommunityTabProps {
  communities?: RelevantCommunity[];
}

export function CommunityTab({ communities }: CommunityTabProps) {
  if (!communities || communities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center fade-in">
        <p className="text-gray-500">No matching communities found for this analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Recommended Communities</h2>
      {communities.map((community) => (
        <a
          key={community.id}
          href={`${APP_URLS.community}/communities/${community.id}`}
          className="block bg-white rounded-2xl border border-gray-200 p-6 card-hover"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{community.name}</h3>
            <span className="inline-flex items-center px-3 py-1 border border-teal-200 text-teal-600 rounded-full text-xs font-medium shrink-0">
              Recommended
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{community.memberCount.toLocaleString()} members</span>
          </div>

          {community.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {community.tags.map((tag) => (
                <span key={tag} className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {community.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-2">{community.description}</p>
          )}

          <p className="text-xs text-teal-600 font-medium">{community.matchReason}</p>
        </a>
      ))}
    </div>
  );
}
