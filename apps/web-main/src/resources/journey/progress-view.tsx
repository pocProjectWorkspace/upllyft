'use client';

import { memo, useState } from 'react';
import Image from '@/components/app-image';
import { ENGAGEMENT_LABELS, HELP_COLORS, HELP_LABELS } from '@upllyft/types';
import type { LibraryCard, Progress } from './api';
import { Chip, DomainBadge, domainColor, domainLabel, formatDay } from './ui';

/** Independence per area per week: one cell per week, coloured by the best try. */
const WeeklyGrid = memo(function WeeklyGrid({ weekly }: { weekly: Progress['weekly'] }) {
  if (!weekly.length) return <p className="text-sm text-gray-500">Log a few tries to see independence grow week by week.</p>;
  return (
    <div className="space-y-2">
      {weekly.map((row) => (
        <div key={row.domain} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm font-medium" style={{ color: domainColor(row.domain).ink }}>
            {domainLabel(row.domain)}
          </span>
          <div className="grid flex-1 grid-cols-8 gap-1.5">
            {row.weeks.map((w, i) => (
              <span
                key={i}
                title={w == null ? 'Nothing logged' : HELP_LABELS[w]}
                className="h-6 rounded-md"
                style={{ background: w == null ? '#f3f4f6' : HELP_COLORS[w] }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1 text-xs text-gray-400">
        <span className="w-32 shrink-0" />
        <span className="flex flex-1 justify-between">
          <span>8 weeks ago</span>
          <span>This week</span>
        </span>
      </div>
    </div>
  );
});

export function ProgressView({
  data,
  childName,
  readOnly,
  banner,
  onSaveSuggestion,
  onOpen,
  domainFilter,
  onDomainFilter,
}: {
  data: Progress;
  childName: string;
  readOnly?: boolean;
  banner?: React.ReactNode;
  onSaveSuggestion?: (card: LibraryCard) => void;
  onOpen?: (card: LibraryCard) => void;
  domainFilter: string | null;
  onDomainFilter: (domain: string | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const timeline = showAll ? data.timeline : data.timeline.slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{childName}’s progress</h2>
        <p className="text-sm text-gray-500">
          Built from what {readOnly ? 'the family logs' : 'you log'} after each activity. These are observations at home, not a clinical assessment.
        </p>
      </div>

      {banner}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [data.stats.logged30, 'Activities logged · last 30 days'],
          [`${data.stats.areas30} / 8`, 'Areas practised · last 30 days'],
          [data.stats.mastered, 'Activities mastered'],
        ].map(([value, label]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-900">By development area</h3>
        <p className="mb-4 text-xs text-gray-500">Independence per week · last 8 weeks</p>
        <WeeklyGrid weekly={data.weekly} />
      </section>

      {!readOnly && data.suggestions.length > 0 && (
        <section className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white">
              <Image src="/Mira.png" alt="Mira" width={28} height={28} />
            </span>
            <h3 className="font-semibold text-teal-900">Mira suggests trying next</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {data.suggestions.map((r) => (
              <div key={`${r.kind}:${r.id}`} className="rounded-xl border border-white bg-white p-4">
                <DomainBadge domain={r.domains[0]} />
                <p className="mt-2 text-sm font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500">
                  {[r.type, r.durationMinutes ? `${r.durationMinutes} min` : null, r.practises].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={() => onSaveSuggestion?.(r)} className="text-sm font-semibold text-teal-700 hover:underline">
                    Save for {childName}
                  </button>
                  <button type="button" onClick={() => onOpen?.(r)} className="text-sm text-gray-500 hover:text-gray-800">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Timeline</h3>
          {domainFilter && (
            <Chip active onClick={() => onDomainFilter(null)}>
              {domainLabel(domainFilter)} ×
            </Chip>
          )}
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing logged here yet. Tap “I tried this” after an activity to start the timeline.</p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HELP_COLORS[e.help] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">
                    {formatDay(e.date)} ·{' '}
                    <button type="button" onClick={() => onDomainFilter(e.domain)} className="hover:underline">
                      {domainLabel(e.domain)}
                    </button>
                  </p>
                  {e.milestone && <p className="text-xs font-semibold text-amber-600">★ {e.milestone}</p>}
                  <p className="text-sm font-medium text-gray-900">{e.title}</p>
                  <p className="text-xs text-gray-500">
                    {HELP_LABELS[e.help]} · {ENGAGEMENT_LABELS[e.engagement]}
                  </p>
                  {e.note && <p className="mt-0.5 text-sm italic text-gray-600">“{e.note}”</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {data.timeline.length > 20 && !showAll && (
          <button type="button" onClick={() => setShowAll(true)} className="mt-4 text-sm font-semibold text-teal-700 hover:underline">
            Show all {data.timeline.length}
          </button>
        )}
      </section>
    </div>
  );
}
