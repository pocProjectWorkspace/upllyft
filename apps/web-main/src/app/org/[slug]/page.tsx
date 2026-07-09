'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@upllyft/ui';
import {
  getOrganization,
  getOrganizationStats,
  type OrgDetails,
} from '@/lib/api/organizations';

interface DashboardStats {
  memberCount: number;
  communityCount: number;
  upcomingEventCount: number;
}

export default function OrgDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    memberCount: 0,
    communityCount: 0,
    upcomingEventCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const orgData = await getOrganization(slug);
        setOrg(orgData);

        // Stats are supplementary — a failure here shouldn't blank the whole page.
        try {
          const data = await getOrganizationStats(slug);
          setStats({
            memberCount: data.memberCount ?? 0,
            communityCount: data.communityCount ?? 0,
            upcomingEventCount: data.upcomingEventCount ?? 0,
          });
        } catch {
          /* keep zeroed defaults */
        }
      } catch {
        setOrg(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner + Logo */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {org.banner ? (
          <div className="h-48 w-full" style={{ background: 'var(--org-gradient)' }}>
            <img src={org.banner} alt={`${org.name} banner`} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 w-full" style={{ background: 'var(--org-gradient)' }} />
        )}
        <div className={`px-6 pb-6 ${org.banner ? '-mt-12' : 'pt-6'}`}>
          <div className="flex items-start gap-4">
            {org.logo ? (
              <div className="w-20 h-20 rounded-xl border-4 border-white bg-white overflow-hidden shadow-lg flex-shrink-0">
                <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-xl border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--org-primary)' }}
              >
                <span className="font-bold text-2xl" style={{ color: 'var(--org-on-primary)' }}>
                  {org.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 mt-2">
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              {org.description && (
                <p className="text-gray-600 mt-1">{org.description}</p>
              )}
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm hover:underline mt-2"
                  style={{ color: 'var(--org-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {org.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <a
          href={`/org/${slug}/communities/create`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-md transition-all hover:opacity-90"
          style={{ background: 'var(--org-gradient)', color: 'var(--org-on-primary)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Community
        </a>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Members" value={stats.memberCount} subtitle="Active members" />
        <StatCard title="Communities" value={stats.communityCount} subtitle="Active spaces" />
        <StatCard title="Engagement Rate" value="-" subtitle="Coming soon" />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEventCount}
          subtitle={stats.upcomingEventCount === 0 ? 'No events scheduled' : 'Scheduled ahead'}
        />
      </div>

      {/* Content cards */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <p className="text-sm text-gray-500">Activity feed coming soon...</p>
        </div>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Organization Info</h3>
          <p className="text-xs text-gray-400 mb-3">Details</p>
          <p className="text-sm text-gray-600">{org.description || 'No description provided.'}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: number | string; subtitle: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
