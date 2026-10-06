'use client';

import { memo, useMemo, useState } from 'react';
import Image from '@/components/app-image';
import { Skeleton, toast } from '@upllyft/ui';
import type { JourneyItemStatus } from '@upllyft/types';
import type { ChildItem, LibraryCard } from './api';
import { useItems, useProgress, useRemove, useSetMastered } from './hooks';
import type { LogTarget } from './log-dialog';
import { Chip, DOMAINS, DomainBadge, HelpLegend, HelpSquares, StatusPill, domainLabel, formatDay } from './ui';

const STATUS_TABS: Array<'all' | JourneyItemStatus> = ['all', 'To try', 'Practising', 'Getting there', 'Mastered'];

export function MyLibraryTab({
  childId,
  childName,
  onTried,
  onOpen,
  onBrowse,
  onBrowseArea,
}: {
  childId: string;
  childName: string;
  onTried: (t: LogTarget) => void;
  onOpen: (card: LibraryCard) => void;
  onBrowse: () => void;
  onBrowseArea: (domain: string) => void;
}) {
  const { data, isLoading } = useItems(childId);
  // Suggestions (screening areas with nothing saved) come with the progress payload.
  const progress = useProgress(childId);
  const [status, setStatus] = useState<'all' | JourneyItemStatus>('all');
  const [domain, setDomain] = useState<string | null>(null);
  const setMastered = useSetMastered(childId);
  const remove = useRemove(childId);

  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (i) => (status === 'all' || i.status === status) && (!domain || i.domain === domain),
      ),
    [data, status, domain],
  );

  const gap = progress.data?.suggestions?.[0];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  const total = data?.items.length ?? 0;
  const mastered = data?.summary.Mastered ?? 0;
  const practising = (data?.summary.Practising ?? 0) + (data?.summary['Getting there'] ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{childName}’s library</h2>
          <p className="text-sm text-gray-500">
            {total === 0
              ? 'Nothing saved yet.'
              : `${total} ${total === 1 ? 'activity' : 'activities'} · ${practising} in progress · ${mastered} mastered`}
          </p>
        </div>
        <button type="button" onClick={onBrowse} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-teal-300">
          Browse resources
        </button>
      </div>

      {gap && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white">
            <Image src="/Mira.png" alt="Mira" width={32} height={32} />
          </span>
          <p className="flex-1 text-sm text-teal-900">
            Nothing saved yet for {domainLabel(gap.domains[0])}, an area from {childName}’s screening. “{gap.title}” could be a good start.
          </p>
          <button type="button" onClick={() => onBrowseArea(gap.domains[0])} className="text-sm font-semibold text-teal-700 hover:underline">
            See suggestions
          </button>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={s === 'all' ? total : data?.summary[s] ?? 0}>
                {s === 'all' ? 'All' : s}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={!domain} onClick={() => setDomain(null)}>All areas</Chip>
            {DOMAINS.filter((d) => data?.items.some((i) => i.domain === d.key)).map((d) => (
              <Chip key={d.key} active={domain === d.key} onClick={() => setDomain(d.key)}>
                {d.label}
              </Chip>
            ))}
          </div>
          <HelpLegend />
        </>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-gray-900">Nothing here yet</p>
          <p className="mt-1 text-sm text-gray-500">Save resources from the library, and they’ll show up here, ready to try.</p>
          <button type="button" onClick={onBrowse} className="mt-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white">
            Browse resources
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onTried={onTried}
              onOpen={onOpen}
              onMastered={(m) => setMastered.mutate({ itemId: item.id, mastered: m })}
              onRemove={() =>
                remove.mutate(item.id, {
                  onError: (e: any) =>
                    toast({ title: 'Could not remove', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' }),
                })
              }
            />
          ))}
          {items.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Nothing with this status yet.</p>}
        </div>
      )}
    </div>
  );
}

const ItemRow = memo(function ItemRow({
  item,
  onTried,
  onOpen,
  onMastered,
  onRemove,
}: {
  item: ChildItem;
  onTried: (t: LogTarget) => void;
  onOpen: (card: LibraryCard) => void;
  onMastered: (mastered: boolean | null) => void;
  onRemove: () => void;
}) {
  const r = item.resource;
  const assigned = item.source === 'ASSIGNED' && !item.unassigned;
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <DomainBadge domain={item.domain} />
            <span className="text-xs text-gray-500">
              {r?.type}
              {r?.durationMinutes ? ` · ${r.durationMinutes} min` : ''}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{r?.title ?? 'Resource no longer available'}</h3>
          {assigned && item.assignedBy && <p className="text-xs text-teal-700">Assigned by {item.assignedBy.name ?? 'your therapist'}</p>}
          {item.unassigned && <p className="text-xs text-gray-400">No longer assigned</p>}
          {(item.goal || r?.forText) && <p className="mt-1 text-sm text-gray-600">◎ For: {item.goal ?? r?.forText}</p>}
          {item.targetDate && (
            <p className="text-xs text-gray-500">Aim for {new Date(item.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
          )}
        </div>
        <StatusPill status={item.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <HelpSquares logs={item.logs} />
          <p className="text-xs text-gray-500">
            {item.lastLog
              ? `Last tried ${formatDay(item.lastLog.date).toLowerCase()}${item.lastLog.note ? ` · “${item.lastLog.note}”` : ''}`
              : 'Not tried yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.status !== 'Mastered' ? (
            item.logs.length > 0 && (
              <button type="button" onClick={() => onMastered(true)} className="text-sm font-medium text-gray-600 hover:text-teal-700">
                Mark mastered
              </button>
            )
          ) : (
            item.masteredOverride && (
              <button type="button" onClick={() => onMastered(null)} className="text-sm font-medium text-gray-500 hover:text-gray-800">
                Undo mastered
              </button>
            )
          )}
          {!assigned && (
            <button type="button" onClick={onRemove} className="text-sm font-medium text-gray-400 hover:text-red-600">
              Remove
            </button>
          )}
          {r && (
            <button type="button" onClick={() => onOpen(r)} className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-teal-300">
              Open
            </button>
          )}
          {r && (
            <button
              type="button"
              onClick={() => onTried({ kind: item.kind, resourceId: r.id, title: r.title, domain: item.domain })}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white"
            >
              I tried this
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
