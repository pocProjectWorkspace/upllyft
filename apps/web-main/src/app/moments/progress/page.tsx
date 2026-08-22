'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@upllyft/ui';
import { useMomentsChild } from '@/components/moments/moments-shell';
import { useMomentProgress } from '@/hooks/use-moments';
import { STATUS_META, STATUS_ORDER } from '@/components/moments/meta';
import type { ProgressStatus } from '@/lib/api/moments';

/**
 * "Progress that matters" — areas grouped by STATUS (what needs me / what's going well),
 * not by clinical domain. Calm groups (Steady, Nothing new) collapse to a one-line
 * reassurance by default; "nothing needed" is a good outcome, not a to-do.
 */
export default function MomentProgressPage() {
  const { child, loading } = useMomentsChild();
  const { data, isLoading } = useMomentProgress(child?.id);
  const [expanded, setExpanded] = useState<Partial<Record<ProgressStatus, boolean>>>({});

  if (loading || !child) return loading ? <Skeleton className="h-64 w-full" /> : null;
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const areas = data?.areas ?? [];
  const groups = STATUS_ORDER.map((status) => ({
    status,
    meta: STATUS_META[status],
    areas: areas.filter((a) => a.status === status),
  })).filter((g) => g.areas.length > 0);

  const anyMoments = areas.some((a) => a.momentCount > 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Progress that matters</h1>
        <p className="text-sm text-gray-500 mt-1">
          See how things are changing in everyday life — not just during therapy. This brings
          together your moments and notes from {child.firstName}&apos;s wider team.
        </p>
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-2.5">
          WHAT THE LABELS MEAN
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
              <span className="font-medium">{STATUS_META[s].label}</span>
              <span className="text-gray-400 hidden sm:inline">— {STATUS_META[s].blurb}</span>
            </span>
          ))}
        </div>
      </div>

      {!anyMoments ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">No moments yet — nothing to group.</p>
          <p className="text-sm text-gray-500 mt-1">
            Once you start capturing moments, each area of {child.firstName}&apos;s development
            shows up here by what it needs from you — if anything.
          </p>
          <Link
            href="/moments"
            className="inline-block mt-4 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            Capture a moment →
          </Link>
        </div>
      ) : (
        groups.map(({ status, meta, areas: groupAreas }) => {
          const open = !meta.calm || !!expanded[status];
          const count = `${groupAreas.length} area${groupAreas.length === 1 ? '' : 's'}`;
          return (
            <section key={status}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  <h2 className={`text-sm font-bold ${meta.text}`}>{meta.label}</h2>
                  <span className="text-xs text-gray-400">{meta.blurb}</span>
                </div>
                {meta.calm && (
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [status]: !e[status] }))}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    {open ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              {!open ? (
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500">
                  {count} {meta.summary}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {groupAreas.map((area) => (
                    <Link
                      key={area.domain}
                      href={`/moments/progress/${area.domain}`}
                      className={`block rounded-xl border p-4 hover:shadow-sm transition-shadow ${meta.card}`}
                    >
                      <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                        {area.label.toUpperCase()}
                        {area.flagged && (
                          <span className="ml-2 text-amber-600">· FLAGGED AT SCREENING</span>
                        )}
                      </p>
                      {area.latestMoment ? (
                        <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">
                          “{area.latestMoment.text}”
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1.5">
                          Nothing captured here recently.
                        </p>
                      )}
                      {area.facts.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">{area.facts.join(' · ')}</p>
                      )}
                      <p className={`text-xs font-semibold mt-2 ${meta.text}`}>View story →</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
