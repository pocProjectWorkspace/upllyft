'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Skeleton } from '@upllyft/ui';
import { getOrgCommunities, type OrgCommunity } from '@/lib/api/organizations';
import { APP_URLS } from '@upllyft/api-client';

export default function OrgCommunitiesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [communities, setCommunities] = useState<OrgCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrgCommunities(slug)
      .then(setCommunities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Communities</h1>
        <a
          href={`/org/${slug}/communities/create`}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Community
        </a>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 text-sm">No communities found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <div key={community.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-bold text-sm">{community.name.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{community.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{community.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{community.memberCount} Members</span>
                <Badge color={community.isActive ? 'green' : 'gray'}>
                  {community.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <a
                href={`${APP_URLS.community}/groups/${community.id}`}
                className="block w-full text-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Community
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
