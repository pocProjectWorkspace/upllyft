'use client';

// Org Admin Hub — the admin's purpose-built landing (distinct from the Clinic
// Dashboard at /org/[slug]). Setup-progress hero, admin metric strip, a single
// "Clinic Management" checklist, and Explore quick-links. All data comes from
// getOrganization + getOrganizationStats (no dedicated endpoint).

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@upllyft/ui';
import { APP_URLS } from '@upllyft/api-client';
import { getOrganization, getOrganizationStats, type OrgDetails } from '@/lib/api/organizations';

interface HubStats {
  memberCount: number;
  communityCount: number;
  upcomingEventCount: number;
  pendingApprovals: number;
  pendingFamilies: number;
}

export default function OrgHubPage() {
  const { slug } = useParams() as { slug: string };
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [stats, setStats] = useState<HubStats>({
    memberCount: 0,
    communityCount: 0,
    upcomingEventCount: 0,
    pendingApprovals: 0,
    pendingFamilies: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const o = await getOrganization(slug);
        setOrg(o);
        try {
          const s = await getOrganizationStats(slug);
          setStats({
            memberCount: s.memberCount ?? 0,
            communityCount: s.communityCount ?? 0,
            upcomingEventCount: s.upcomingEventCount ?? 0,
            pendingApprovals: s.pendingApprovals ?? 0,
            pendingFamilies: s.pendingFamilies ?? 0,
          });
        } catch {
          /* stats supplementary */
        }
      } catch {
        setOrg(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!org) {
    return <div className="text-center py-16 text-gray-500">Organization not found.</div>;
  }

  const detailsDone = !!(org.description || org.logo);
  const established = stats.memberCount > 0;
  const setupSteps = [detailsDone, stats.memberCount > 0, stats.communityCount > 0, stats.upcomingEventCount > 0];
  const progress = Math.round((setupSteps.filter(Boolean).length / setupSteps.length) * 100);

  const metrics = [
    { label: 'Approvals', value: stats.pendingApprovals, hint: 'therapists pending review', href: `/org/${slug}/members` },
    { label: 'Intake', value: stats.pendingFamilies, hint: 'families awaiting access', href: `/org/${slug}/families` },
    { label: 'Communities', value: stats.communityCount, hint: 'active spaces', href: `/org/${slug}/communities` },
    { label: 'Events', value: stats.upcomingEventCount, hint: 'upcoming', href: `/org/${slug}/events` },
  ];

  const clinicRows = [
    { label: 'Organization Settings', desc: 'Name, description & branding', href: `/org/${slug}/settings`, pill: detailsDone ? 'Configured' : 'Set up now', done: detailsDone },
    { label: 'Members', desc: 'Invite and onboard your team', href: `/org/${slug}/members`, pill: stats.memberCount > 0 ? `${stats.memberCount} member${stats.memberCount === 1 ? '' : 's'}` : 'Not started', done: stats.memberCount > 0 },
    { label: 'Clients', desc: 'Review intake & grant access', href: `/org/${slug}/families`, pill: stats.pendingFamilies > 0 ? `${stats.pendingFamilies} pending` : 'Up to date', done: stats.pendingFamilies === 0 },
    { label: 'Communities', desc: 'Themed spaces for families & team', href: `/org/${slug}/communities`, pill: stats.communityCount > 0 ? `${stats.communityCount} active` : 'None yet', done: stats.communityCount > 0 },
    { label: 'Events', desc: 'Workshops, webinars & meetups', href: `/org/${slug}/events`, pill: stats.upcomingEventCount > 0 ? `${stats.upcomingEventCount} upcoming` : 'None yet', done: stats.upcomingEventCount > 0 },
  ];

  const explore = [
    { label: 'Screening', href: APP_URLS.screening },
    { label: 'Book Session', href: APP_URLS.booking },
    { label: 'Learning', href: APP_URLS.resources },
    { label: 'Community', href: APP_URLS.community },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--org-gradient)', color: 'var(--org-on-primary)' }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              {established ? 'Your clinic, at a glance' : "Let's bring your clinic online"}
            </h1>
            <p className="text-sm opacity-90 mt-1 max-w-xl">
              {established
                ? `Manage ${org.name} — your team, clients, communities and events, all in one place.`
                : 'Set up your organization, invite your clinical team, and configure booking & fees — all from one place.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{progress}%</p>
            <p className="text-xs opacity-80">setup complete</p>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full rounded-full bg-white/90" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={established ? `/org/${slug}/members` : `/org/${slug}/settings`}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-white/95 hover:bg-white"
            style={{ color: 'var(--org-primary)' }}
          >
            {established ? 'Add a member' : 'Set up organization'}
          </a>
          <a
            href={`/org/${slug}`}
            className="rounded-xl px-4 py-2 text-sm font-medium border border-white/60 hover:bg-white/10"
          >
            Open clinic dashboard
          </a>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <a key={m.label} href={m.href} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
            <p className="text-sm font-medium text-gray-500">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.hint}</p>
          </a>
        ))}
      </div>

      {/* Clinic Management */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Clinic Management</h2>
          <p className="text-sm text-gray-500">Everything you need to set up and run your clinic.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {clinicRows.map((row) => (
            <li key={row.label}>
              <a href={row.href} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}
                >
                  <span className="text-sm font-bold">{row.label.charAt(0)}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{row.label}</p>
                  <p className="text-xs text-gray-500 truncate">{row.desc}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${row.done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {row.pill}
                </span>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Explore */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Explore Upllyft</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {explore.map((e) => (
            <a key={e.label} href={e.href} className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:border-gray-300 transition-colors">
              <span className="text-sm font-medium text-gray-700">{e.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
