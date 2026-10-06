'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Skeleton, toast, useDebounce } from '@upllyft/ui';
import type { LibraryCard, LibraryFilters } from './api';
import { useLibrary, useRemove, useSave, useScreening } from './hooks';
import { ResourceCard } from './resource-card';
import { ScreeningCard } from './screening-card';
import { Chip, DOMAINS, domainLabel } from './ui';
import type { LogTarget } from './log-dialog';

const TYPES: Array<[string, string]> = [
  ['All', 'All'],
  ['Guide', 'Guides'],
  ['Worksheet', 'Worksheets'],
  ['Video', 'Videos'],
  ['Social story', 'Social stories'],
  ['Printable', 'Printables'],
];
const PAGE_SIZE = 12;

export function LibraryTab({
  childId,
  childName,
  initialDomain,
  onDomainChange,
  onTried,
  onOpen,
}: {
  childId: string;
  childName: string;
  initialDomain: string | null;
  onDomainChange: (domain: string | null) => void;
  onTried: (target: LogTarget) => void;
  onOpen: (card: LibraryCard) => void;
}) {
  const [q, setQ] = useState('');
  const search = useDebounce(q, 350);
  const [type, setType] = useState('All');
  const [domain, setDomain] = useState<string | null>(initialDomain);
  const [ageFit, setAgeFit] = useState(true);
  const [matchOnly, setMatchOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => setDomain(initialDomain), [initialDomain]);
  useEffect(() => setPage(1), [search, type, domain, ageFit, matchOnly, childId]);

  const filters: LibraryFilters = useMemo(
    () => ({ q: search || undefined, type, domain: domain ?? undefined, ageFit, matchOnly, page, limit: PAGE_SIZE }),
    [search, type, domain, ageFit, matchOnly, page],
  );
  const { data, isLoading, isFetching } = useLibrary(childId, filters);
  const screening = useScreening(childId);
  const save = useSave(childId);
  const remove = useRemove(childId);

  const pickDomain = (d: string | null) => {
    setDomain(d);
    onDomainChange(d);
  };

  const onSave = useCallback(
    async (card: LibraryCard) => {
      try {
        const item = await save.mutateAsync({ kind: card.kind, resourceId: card.id });
        toast({
          title: `Saved for ${childName}`,
          description: card.title,
          action: (
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium"
              onClick={() => remove.mutate(item.id)}
            >
              Undo
            </button>
          ) as any,
        });
      } catch (e: any) {
        toast({ title: 'Could not save', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' });
      }
    },
    [save, remove, childName],
  );

  const onTriedCard = useCallback(
    (card: LibraryCard) => onTried({ kind: card.kind, resourceId: card.id, title: card.title, domain: card.domains[0] ?? null }),
    [onTried],
  );

  const findingDomains = (screening.data?.findings ?? []).map((f) => f.domain);
  const focusDomains = (screening.data?.findings ?? []).filter((f) => f.level === 'focus').map((f) => f.domain);
  const byDomain = data?.facets.byDomain;
  const byType = data?.facets.byType;

  return (
    <div className="space-y-6">
      <ScreeningCard
        summary={screening.data}
        loading={screening.isLoading}
        childName={childName}
        activeDomain={domain}
        onPickDomain={pickDomain}
      />

      <div className="space-y-3">
        <Input
          placeholder="Search guides, stories and printables…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 rounded-xl"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={!domain} onClick={() => pickDomain(null)}>All areas</Chip>
          {DOMAINS.map((d) => (
            <Chip key={d.key} active={domain === d.key} onClick={() => pickDomain(d.key)} count={byDomain?.[d.key]}>
              {focusDomains.includes(d.key) && <span className="text-[10px] font-bold uppercase text-orange-600">Focus</span>}
              {d.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPES.map(([value, label]) => (
              <Chip key={value} active={type === value} onClick={() => setType(value)} count={byType?.[value] ?? 0}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={ageFit} onChange={(e) => setAgeFit(e.target.checked)} className="accent-teal-600" />
              Suited to {childName}’s age
            </label>
            {findingDomains.length > 0 && (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={matchOnly} onChange={(e) => setMatchOnly(e.target.checked)} className="accent-teal-600" />
                Matches screening only
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          <span className="font-semibold text-gray-900">{data?.total ?? 0}</span> resources
        </span>
        {domain && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5">
            Showing resources for {domainLabel(domain)}
            <button type="button" aria-label="Clear area" onClick={() => pickDomain(null)} className="ml-1 text-gray-500 hover:text-gray-800">
              ×
            </button>
          </span>
        )}
        {isFetching && !isLoading && <span className="text-xs text-gray-400">Updating…</span>}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-gray-900">No resources match</p>
          <p className="mt-1 text-sm text-gray-500">Try another area, or turn off the age filter.</p>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setType('All');
              pickDomain(null);
              setAgeFit(false);
              setMatchOnly(false);
            }}
            className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((card) => (
              <ResourceCard
                key={`${card.kind}:${card.id}`}
                card={card}
                childName={childName}
                onSave={onSave}
                onTried={onTriedCard}
                onOpen={onOpen}
                saving={save.isPending}
              />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {data.totalPages}
              </span>
              <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
