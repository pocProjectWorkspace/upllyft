'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Skeleton } from '@upllyft/ui';
import { getOrgCommunities, type OrgCommunity } from '@/lib/api/organizations';
import { APP_URLS } from '@upllyft/api-client';

const ACCENTS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
function accentFor(key: string): string {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}
function humanizeLabel(s?: string | null): string {
  if (!s) return '';
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Communities</h1>
          <p className="text-sm text-gray-500 mt-1">Themed spaces for families and your team. Set eligibility, moderators &amp; guidelines, then publish.</p>
        </div>
        <a
          href={`/org/${slug}/communities/create`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'var(--org-gradient)', color: 'var(--org-on-primary)' }}
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
              <div className="h-1.5 -mx-5 -mt-5 mb-4 rounded-t-2xl" style={{ backgroundColor: accentFor(community.id) }} />
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--org-primary-soft)' }}
                >
                  <span className="font-bold text-sm" style={{ color: 'var(--org-primary)' }}>
                    {community.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{community.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{community.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{community.memberCount ?? community._count?.members ?? 0} Members</span>
                <Badge color={community.isActive ? 'green' : 'yellow'}>
                  {community.isActive ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(community.condition || community.type) && (
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}>
                    {humanizeLabel(community.condition || community.type)}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                  {community.inviteOnly ? 'Invite only' : 'Open enrollment'}
                </span>
              </div>
              <a
                href={`${APP_URLS.community}/communities/${community.id}`}
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
