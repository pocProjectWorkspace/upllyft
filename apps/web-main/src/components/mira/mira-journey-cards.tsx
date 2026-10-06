'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ENGAGEMENT_LABELS, HELP_COLORS, HELP_LABELS } from '@upllyft/types';
import { journeyApi, type ResourceKind } from '@/resources/journey/api';
import { journeyKeys } from '@/resources/journey/hooks';
import { DomainBadge } from '@/resources/journey/ui';

/** A real library resource Mira suggested for this child — save it or open it. */
export function MiraResourceCard({ data }: { data: any }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [saved, setSaved] = useState<boolean>(!!data.savedItemId);
  const save = useMutation({
    mutationFn: () => journeyApi.save(data.childId, data.kind as ResourceKind, data.id),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: journeyKeys.child(data.childId) });
    },
  });

  const open = () =>
    data.kind === 'WORKSHEET'
      ? router.push(`/resources/${data.id}`)
      : router.push(`/resources?child=${data.childId}${data.domains?.[0] ? `&area=${data.domains[0]}` : ''}`);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <DomainBadge domain={data.domains?.[0]} />
        {data.matchesScreening && <span className="text-[10px] font-semibold text-teal-700">Matches screening</span>}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-gray-900">{data.title}</p>
      <p className="text-xs text-gray-500">
        {[data.type, data.durationMinutes ? `${data.durationMinutes} min` : null, data.practises].filter(Boolean).join(' · ')}
      </p>
      <div className="mt-2 flex items-center gap-3">
        {saved ? (
          <span className="text-xs font-semibold text-teal-700">Saved ✓</span>
        ) : (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save to library
          </button>
        )}
        <button type="button" onClick={open} className="text-xs font-semibold text-teal-700 hover:underline">
          Open →
        </button>
      </div>
    </div>
  );
}

/**
 * "Log this?" — pre-filled from what the parent told Mira. Nothing is written until
 * the parent taps Save log; anything Mira could not tell is left for them to choose.
 */
export function MiraLogPromptCard({ data }: { data: any }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [match, setMatch] = useState<{ kind: ResourceKind; resourceId: string; title: string } | null>(data.match);
  const [help, setHelp] = useState<number | null>(data.help);
  const [engagement, setEngagement] = useState<number | null>(data.engagement);
  const [done, setDone] = useState(false);
  const day = new Date(data.date);
  const dayLabel =
    day.toDateString() === new Date().toDateString()
      ? 'today'
      : day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const log = useMutation({
    mutationFn: () =>
      journeyApi.log(data.childId, {
        kind: match!.kind,
        resourceId: match!.resourceId,
        date: data.date,
        help: help!,
        engagement: engagement!,
      }),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: journeyKeys.child(data.childId) });
    },
  });

  const edit = () => {
    if (!match) return;
    sessionStorage.setItem(
      'journey:prefill-log',
      JSON.stringify({
        childId: data.childId,
        target: { kind: match.kind, resourceId: match.resourceId, title: match.title, domain: null, help, engagement, date: data.date },
      }),
    );
    router.push(`/resources?child=${data.childId}&tab=mine`);
  };

  if (done) {
    return (
      <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
        Logged “{match?.title}” for {dayLabel}. It’s in your child’s progress.
      </div>
    );
  }

  if (!match) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-sm font-semibold text-gray-900">Which activity was it?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(data.options ?? []).map((o: any) => (
            <button
              key={`${o.kind}:${o.resourceId}`}
              type="button"
              onClick={() => setMatch(o)}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:border-teal-300"
            >
              {o.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const scale = (labels: readonly string[], value: number | null, set: (n: number) => void, colors?: readonly string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => set(i)}
          className={`rounded-full border px-2.5 py-1 text-xs ${value === i ? 'border-teal-500 bg-teal-50 font-semibold text-teal-800' : 'border-gray-200 text-gray-600'}`}
        >
          {colors && <span className="mr-1 inline-block h-2 w-2 rounded-[2px]" style={{ background: colors[i] }} />}
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-sm font-semibold text-gray-900">Log this for your child?</p>
      <p className="text-xs text-gray-500">
        {match.title} · {dayLabel}
      </p>
      {scale(HELP_LABELS, help, setHelp, HELP_COLORS)}
      {scale(ENGAGEMENT_LABELS, engagement, setEngagement)}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={help === null || engagement === null || log.isPending}
          onClick={() => log.mutate()}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {log.isPending ? 'Saving…' : 'Save log'}
        </button>
        <button type="button" onClick={edit} className="text-xs font-semibold text-teal-700 hover:underline">
          Edit
        </button>
        {log.isError && <span className="text-xs text-red-600">Couldn’t save — try Edit.</span>}
      </div>
    </div>
  );
}
