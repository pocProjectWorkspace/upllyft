'use client';

import Link from 'next/link';
import { Skeleton } from '@upllyft/ui';
import type { ScreeningSummary } from './api';
import { DOMAINS, LEVEL_STYLE, domainColor, domainLabel } from './ui';

/** "Personalised from Aarav's screening" — or the invitation to screen. */
export function ScreeningCard({
  summary,
  loading,
  childName,
  activeDomain,
  onPickDomain,
}: {
  summary: ScreeningSummary | null | undefined;
  loading: boolean;
  childName: string;
  activeDomain: string | null;
  onPickDomain: (domain: string | null) => void;
}) {
  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  if (!summary) {
    return (
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Get resources matched to {childName}</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Complete a short screening across all 8 areas, and we’ll point you to the resources that fit what it finds.
        </p>
        <Link
          href="/screening"
          className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Start screening · 15 min
        </Link>
      </section>
    );
  }

  const when = summary.completedAt
    ? new Date(summary.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Personalised from {childName}’s screening</h2>
          {when && <p className="text-sm text-gray-500">Screening completed {when}</p>}
        </div>
        <Link href="/screening" className="text-sm font-semibold text-teal-700 hover:underline">
          View screening report →
        </Link>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Result by area</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DOMAINS.filter((d) => d.screening).map((d) => {
            const level = summary.areas.find((a) => a.domain === d.key)?.level;
            const s = level ? LEVEL_STYLE[level] : null;
            return (
              <div key={d.key} className="rounded-xl border border-gray-100 px-3 py-2">
                <p className="text-xs font-medium text-gray-700">{d.label}</p>
                <p className="text-xs font-semibold" style={{ color: s?.fg ?? '#9ca3af' }}>
                  {s?.label ?? 'Not screened'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {summary.findings.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            What the screening found · tap to see matching resources
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {summary.findings.map((f) => {
              const c = domainColor(f.domain);
              const active = activeDomain === f.domain;
              return (
                <button
                  key={f.domain}
                  type="button"
                  onClick={() => onPickDomain(active ? null : f.domain)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    active ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'
                  }`}
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold" style={{ color: c.ink }}>
                      {domainLabel(f.domain)} · {LEVEL_STYLE[f.level].label}
                    </span>
                    <span className="block text-sm text-gray-700">{f.text}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-gray-500">
                    {f.count} {f.count === 1 ? 'resource' : 'resources'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
