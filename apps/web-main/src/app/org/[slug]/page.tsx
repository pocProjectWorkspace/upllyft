'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Skeleton } from '@upllyft/ui';
import { APP_URLS } from '@upllyft/api-client';
import {
  getOrganization,
  getOrganizationStats,
  getMyFacilities,
  getOrgCommunities,
  getOrgEvents,
  getOrgActivity,
  type OrgDetails,
  type OrgFacility,
  type OrgCommunity,
  type OrgEvent,
  type OrgActivityItem,
} from '@/lib/api/organizations';

interface DashboardStats {
  memberCount: number;
  communityCount: number;
  upcomingEventCount: number;
  pendingApprovals: number;
  pendingFamilies: number;
}

export default function OrgDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [facilities, setFacilities] = useState<OrgFacility[]>([]);
  const [communities, setCommunities] = useState<OrgCommunity[]>([]);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [activity, setActivity] = useState<OrgActivityItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    memberCount: 0,
    communityCount: 0,
    upcomingEventCount: 0,
    pendingApprovals: 0,
    pendingFamilies: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const orgData = await getOrganization(slug);
        setOrg(orgData);

        // The org's sites (nurseries / clinics). Supplementary — a failure here must not
        // blank the page. Filtered to THIS org so a multi-org staff member sees the right
        // ones.
        try {
          const all = await getMyFacilities();
          setFacilities(all.filter((f) => f.organizationId === orgData.id));
        } catch {
          /* leave empty */
        }

        // Stats are supplementary — a failure here shouldn't blank the whole page.
        try {
          const data = await getOrganizationStats(slug);
          setStats({
            memberCount: data.memberCount ?? 0,
            communityCount: data.communityCount ?? 0,
            upcomingEventCount: data.upcomingEventCount ?? 0,
            pendingApprovals: data.pendingApprovals ?? 0,
            pendingFamilies: data.pendingFamilies ?? 0,
          });
        } catch {
          /* keep zeroed defaults */
        }

        // Supplementary lists for the dashboard panels.
        try {
          const [comms, evs, act] = await Promise.all([getOrgCommunities(slug), getOrgEvents(slug), getOrgActivity(slug)]);
          setCommunities(comms);
          setEvents(evs);
          setActivity(act);
        } catch {
          /* leave empty */
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingEvents = events
    .filter((e) => !e.isCancelled && new Date(e.startDate) >= todayStart)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

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

      {(stats.pendingApprovals > 0 || stats.pendingFamilies > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <span className="font-medium">Needs your attention.</span>{' '}
            {stats.pendingApprovals > 0 && (
              <a href={`/org/${slug}/members`} className="underline">
                {stats.pendingApprovals} therapist{stats.pendingApprovals === 1 ? '' : 's'} pending review
              </a>
            )}
            {stats.pendingApprovals > 0 && stats.pendingFamilies > 0 && ' · '}
            {stats.pendingFamilies > 0 && (
              <a href={`/org/${slug}/families`} className="underline">
                {stats.pendingFamilies} famil{stats.pendingFamilies === 1 ? 'y' : 'ies'} awaiting access
              </a>
            )}
          </div>
        </div>
      )}

      {/* Facilities — the org's nurseries / clinics, and the door into each. */}
      {facilities.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your facilities</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {facilities.map((f) => {
              const isNursery = f.type === 'NURSERY' || f.type === 'SCHOOL';
              // A nursery/school opens the nursery workspace in the Cases app; a clinic
              // opens the clinic admin. Only the nursery link is wired for now.
              const href = isNursery ? `${APP_URLS.cases}/nursery` : `${APP_URLS.admin}`;
              return (
                <a
                  key={f.id}
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:border-teal-300 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{f.name}</p>
                    <p className="text-xs text-gray-500">
                      {f.type.charAt(0) + f.type.slice(1).toLowerCase()} ·{' '}
                      {f._count.members} staff · {f._count.rooms} room{f._count.rooms === 1 ? '' : 's'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Content cards */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--org-primary)' }} />
                  <div className="min-w-0">
                    <p className="text-gray-800">{a.text}</p>
                    <p className="text-xs text-gray-400">{new Date(a.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Organization Info</h3>
            <a href={`/org/${slug}/settings`} className="text-xs hover:underline" style={{ color: 'var(--org-primary)' }}>
              Edit details →
            </a>
          </div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-gray-500">Branches</dt>
              <dd className="text-gray-900">{facilities.length}</dd>
            </div>
            {org.website && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Website</dt>
                <dd className="text-gray-900 truncate ml-2">{org.website.replace(/^https?:\/\//, '')}</dd>
              </div>
            )}
          </dl>
          <p className="text-sm text-gray-600 mt-3">{org.description || 'No description provided.'}</p>
        </div>
      </div>

      {/* Upcoming Events + Communities */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
            <a href={`/org/${slug}/events`} className="text-xs hover:underline" style={{ color: 'var(--org-primary)' }}>View all →</a>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming events.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}>
                    <span className="text-[9px] leading-none uppercase">{new Date(e.startDate).toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 truncate">{e.title}</p>
                    <p className="text-xs text-gray-400">
                      {e.format === 'IN_PERSON' ? 'In Person' : e.format === 'VIRTUAL' ? 'Virtual' : 'Hybrid'}
                      {e.community ? ` · ${e.community.name}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Communities</h3>
            <a href={`/org/${slug}/communities`} className="text-xs hover:underline" style={{ color: 'var(--org-primary)' }}>View all →</a>
          </div>
          {communities.length === 0 ? (
            <p className="text-sm text-gray-400">No communities yet.</p>
          ) : (
            <ul className="space-y-3">
              {communities.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}>
                      <span className="text-xs font-bold">{c.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.memberCount ?? c._count?.members ?? 0} members</p>
                    </div>
                  </div>
                  <Badge color={c.isActive ? 'green' : 'yellow'}>{c.isActive ? 'Published' : 'Draft'}</Badge>
                </li>
              ))}
            </ul>
          )}
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
