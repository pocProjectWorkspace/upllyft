'use client';

import { use } from 'react';
import Link from 'next/link';
import { Skeleton } from '@upllyft/ui';
import { useMomentsChild } from '@/components/moments/moments-shell';
import { useAreaDetail, useMomentProgress } from '@/hooks/use-moments';
import { STATUS_META, friendlyDate } from '@/components/moments/meta';

const SOURCE_STYLES: Record<string, { label: string; chip: string; dot: string }> = {
  parent: { label: 'You', chip: 'bg-pink-50 text-pink-700', dot: 'bg-pink-500' },
  nursery: { label: 'Nursery', chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  professional: { label: 'Care team', chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
};

export default function AreaDetailPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = use(params);
  const { child, loading } = useMomentsChild();
  const { data, isLoading } = useAreaDetail(child?.id, domain);
  const { data: progressData } = useMomentProgress(child?.id);

  if (loading || !child) return loading ? <Skeleton className="h-64 w-full" /> : null;
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const area = progressData?.areas.find((a) => a.domain === domain);
  const statusMeta = area ? STATUS_META[area.status] : null;
  const maxWeek = Math.max(1, ...data.trend);

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/moments/progress"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Progress that matters
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{data.label}</h1>
          {statusMeta && (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusMeta.card} ${statusMeta.text}`}>
              {statusMeta.label.toUpperCase()}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          What&apos;s changing in {child.firstName}&apos;s everyday life — last 6 weeks.
        </p>
      </div>

      {/* ── 6-week trend ────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-4">
          MOMENTS CAPTURED, WEEK BY WEEK
        </p>
        <div className="flex items-end gap-3 h-24">
          {data.trend.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-t-md ${count > 0 ? 'bg-teal-500' : 'bg-slate-200'}`}
                style={{ height: `${Math.max(6, (count / maxWeek) * 88)}px` }}
              />
              <span className="text-[10px] text-gray-400">W{i + 1}</span>
            </div>
          ))}
        </div>
        {area?.flagged && (
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-50">
            This area was flagged at {child.firstName}&apos;s screening. Everyday moments don&apos;t
            change that result — they add the real-life picture alongside it.
          </p>
        )}
      </section>

      {/* ── Evidence log ────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Recent evidence</h2>
          <p className="text-xs text-gray-400">Your moments and notes from the team, side by side</p>
        </div>

        {data.evidence.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Nothing captured in this area in the last six weeks. Quiet is fine.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {data.evidence.map((e) => {
              const src = SOURCE_STYLES[e.sourceType] ?? SOURCE_STYLES.professional;
              return (
                <div key={e.id} className="px-4 py-3.5 flex gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-none ${src.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">“{e.text}”</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${src.chip}`}>
                        {e.sourceLabel}
                      </span>
                      {e.place && <span className="text-xs text-gray-400">{e.place}</span>}
                      <span className="text-xs text-gray-400">· {friendlyDate(e.date)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
