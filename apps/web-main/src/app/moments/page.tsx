'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@upllyft/ui';
import { useMomentsChild } from '@/components/moments/moments-shell';
import { CaptureModal } from '@/components/moments/capture-modal';
import { MomentCard } from '@/components/moments/moment-card';
import { useMoments, useDeleteMoment, useMomentInsights, useMomentProgress } from '@/hooks/use-moments';
import { INSIGHT_TYPE_META, STATUS_META, friendlyDate } from '@/components/moments/meta';

export default function MomentsHomePage() {
  const { child, loading } = useMomentsChild();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: momentsData, isLoading: momentsLoading } = useMoments(child?.id, {
    limit: showAll ? 50 : 6,
  });
  const { data: insightsData } = useMomentInsights(child?.id);
  const { data: progressData } = useMomentProgress(child?.id);
  const deleteMoment = useDeleteMoment(child?.id);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!child) return null;

  const moments = momentsData?.moments ?? [];
  const insights = (insightsData?.insights ?? []).slice(0, 2);
  const changing = (progressData?.areas ?? [])
    .filter((a) => a.status !== 'NOTHING_NEW' && a.momentCount > 0)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* ── Capture entry ───────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900">Everyday Moments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Small moments can tell us a lot about how {child.firstName} is doing. Capture anything —
          nothing to fill in, just what you noticed.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="primary" onClick={() => setCaptureOpen(true)}>
            + Capture a moment
          </Button>
          <Button variant="outline" onClick={() => setCaptureOpen(true)}>
            🎙 Tell Mira
          </Button>
        </div>
      </section>

      {/* ── Mira has noticed (preview) ──────────────────────── */}
      {insights.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Mira has noticed</h2>
            <Link href="/moments/insights" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              See all →
            </Link>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {insights.length === 1 ? 'One thing' : 'Two things'} this week. Nothing urgent.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.map((insight) => {
              const meta = INSIGHT_TYPE_META[insight.type];
              return (
                <Link
                  key={insight.id}
                  href="/moments/insights"
                  className={`block rounded-xl border p-4 hover:shadow-sm transition-shadow ${meta.card}`}
                >
                  <p className={`text-[11px] font-semibold tracking-wide ${meta.text}`}>
                    {meta.label.toUpperCase()}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{insight.title}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{insight.body}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent moments ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent moments</h2>
            <p className="text-xs text-gray-400">Nothing to fill in — just what you told us</p>
          </div>
          {!showAll && (momentsData?.total ?? 0) > 6 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              See all moments →
            </button>
          )}
        </div>

        {momentsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : moments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              You haven&apos;t captured anything yet — and that&apos;s fine.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Whenever something small happens — good, hard or just different — tell Mira. Patterns
              build up from tiny things.
            </p>
            <Button variant="primary" className="mt-4" onClick={() => setCaptureOpen(true)}>
              Capture your first moment
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {moments.map((m) => (
              <MomentCard key={m.id} moment={m} onDelete={() => deleteMoment.mutate(m.id)} />
            ))}
          </div>
        )}
      </section>

      {/* ── What's changing (preview) ───────────────────────── */}
      {changing.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">What&apos;s changing</h2>
            <Link href="/moments/progress" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              See all progress →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {changing.map((area) => {
              const meta = STATUS_META[area.status];
              return (
                <Link
                  key={area.domain}
                  href={`/moments/progress/${area.domain}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full flex-none ${meta.dot}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{area.label}</span>
                    <span className="block text-xs text-gray-500">
                      {area.facts.join(' · ') || 'No moments yet'}
                    </span>
                  </span>
                  <span className={`text-[11px] font-semibold ${meta.text}`}>{meta.label.toUpperCase()}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <CaptureModal
        childId={child.id}
        childName={child.firstName}
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
      />
    </div>
  );
}
