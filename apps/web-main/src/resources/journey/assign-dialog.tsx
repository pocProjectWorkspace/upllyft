'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, Input, Skeleton, toast, useDebounce } from '@upllyft/ui';
import { journeyApi, type LibraryCard } from './api';
import { journeyKeys } from './hooks';
import { ResourceCard } from './resource-card';
import { DOMAINS } from './ui';

type Source = 'library' | 'mine' | 'new';

const SOURCES: Array<{ key: Source; label: string }> = [
  { key: 'library', label: 'Resource Library' },
  { key: 'mine', label: 'My Library' },
  { key: 'new', label: 'Create New' },
];

/**
 * The one assign journey. Opened from a child's panel on Assignments (child fixed,
 * pick a resource) or from a resource's own page (resource fixed, pick a child).
 * Child → area → resource from any of the three sources → goal / area / target date.
 */
export function AssignDialog({
  open,
  onClose,
  childId: fixedChildId,
  resource: fixedResource,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-selected child (the panel the journey started from). */
  childId?: string;
  /** Pre-selected resource (the page the journey started from). */
  resource?: LibraryCard;
  onOpen?: (card: LibraryCard) => void;
}) {
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: journeyKeys.clients(), queryFn: journeyApi.myClients, enabled: open });
  const [pickedChildId, setPickedChildId] = useState('');
  const childId = fixedChildId || pickedChildId;
  const child = clients.data?.clients.find((c) => c.id === childId);
  const childName = child?.firstName ?? 'this child';

  const [source, setSource] = useState<Source>('library');
  const [q, setQ] = useState('');
  const search = useDebounce(q, 350);
  const [domain, setDomain] = useState('');
  const [picked, setPicked] = useState<LibraryCard | null>(null);
  const chosen = fixedResource ?? picked;
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');
  const [area, setArea] = useState(fixedResource?.domains[0] ?? '');

  const filters = useMemo(
    () => ({
      q: search || undefined,
      domain: domain || undefined,
      source: source === 'new' ? undefined : source,
      ageFit: true,
      limit: 24,
      childId,
    }),
    [search, domain, source, childId],
  );
  const library = useQuery({
    queryKey: journeyKeys.assignable(filters),
    queryFn: () => journeyApi.assignable(filters),
    enabled: open && !!childId && !chosen && source !== 'new',
    placeholderData: keepPreviousData,
  });

  // What this child already has from you, so assigning it again is a deliberate choice.
  const assigned = useQuery({
    queryKey: journeyKeys.assigned(childId),
    queryFn: () => journeyApi.assigned(childId),
    enabled: open && !!childId,
  });
  const alreadyAssigned =
    !!chosen &&
    !!assigned.data?.items.some(
      (i) => !i.unassigned && i.resource?.kind === chosen.kind && i.resource?.id === chosen.id,
    );

  function reset() {
    setPicked(null);
    setGoal('');
    setTarget('');
    setArea(fixedResource?.domains[0] ?? '');
    if (!fixedChildId) setPickedChildId('');
  }

  const assign = useMutation({
    mutationFn: () =>
      journeyApi.assign(childId, {
        kind: chosen!.kind,
        resourceId: chosen!.id,
        goal: goal.trim() || undefined,
        targetDate: target ? new Date(`${target}T12:00:00`).toISOString() : undefined,
        assignedArea: area || undefined,
      }),
    onSuccess: (res) => {
      toast({
        title: res.reassigned ? `Assigned to ${childName} again` : `Assigned to ${childName}`,
        description:
          res.parentNotified === false
            ? `${chosen?.title} is in their library. No one has been notified: the family hasn't joined Upllyft yet.`
            : `${chosen?.title} is now in their library and the family has been notified.`,
      });
      qc.invalidateQueries({ queryKey: journeyKeys.assigned(childId) });
      qc.invalidateQueries({ queryKey: journeyKeys.clients() });
      reset();
      onClose();
    },
    onError: (e: any) => toast({ title: 'Could not assign', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' }),
  });

  const selectCls = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogTitle className="text-lg font-semibold text-gray-900">
          {chosen ? `Assign “${chosen.title}”` : `Assign a resource to ${childName}`}
        </DialogTitle>

        {/* 1. Child */}
        {!fixedChildId && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">Child</span>
            {clients.isLoading ? (
              <Skeleton className="h-10 rounded-xl" />
            ) : !clients.data?.clients.length ? (
              <p className="text-sm text-gray-500">
                No clients yet. Children appear once a family has a confirmed booking with you, or you are on their care team.
              </p>
            ) : (
              <select value={pickedChildId} onChange={(e) => setPickedChildId(e.target.value)} className={selectCls}>
                <option value="">Select a child…</option>
                {clients.data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName}
                    {c.age != null ? ` · ${c.age}y` : ''} · {c.parent.name ?? 'Parent'}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

        {child && child.parentLinked === false && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {child.firstName}&apos;s family hasn&apos;t joined Upllyft yet, so no one will be notified. The resource will be
            waiting for them when they claim {child.firstName}&apos;s profile.
          </p>
        )}

        {childId && !chosen && (
          <div className="space-y-4">
            {/* 2. Area */}
            <div>
              <span className="mb-2 block text-sm font-semibold text-gray-800">Area</span>
              <div className="flex flex-wrap gap-2">
                {[{ key: '', label: 'All areas' }, ...DOMAINS].map((d) => (
                  <button
                    key={d.key || 'all'}
                    type="button"
                    onClick={() => setDomain(d.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                      domain === d.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-teal-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Source */}
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSource(s.key)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    source === s.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {source === 'new' ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="font-semibold text-gray-900">Create a worksheet for {childName}</p>
                <p className="mt-1 text-sm text-gray-500">
                  It is saved to My Library, and the last step assigns it to {childName} without starting again.
                </p>
                <Link
                  href={`/resources/create?assignTo=${encodeURIComponent(childId)}`}
                  className="mt-4 inline-block rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Create new
                </Link>
              </div>
            ) : (
              <>
                <Input
                  placeholder={source === 'mine' ? 'Search My Library…' : 'Search the Resource Library…'}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-10 rounded-xl"
                />
                {library.isLoading ? (
                  <Skeleton className="h-48 rounded-2xl" />
                ) : !library.data?.items.length ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    {source === 'mine' ? 'Nothing in My Library matches. ' : 'Nothing matches. '}
                    Try another search or area.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {library.data.items.map((card) => (
                      <ResourceCard
                        key={`${card.kind}:${card.id}`}
                        card={card}
                        childName={childName}
                        onOpen={onOpen ?? (() => {})}
                        onPick={(c) => {
                          setPicked(c);
                          setArea(domain || c.domains[0] || '');
                        }}
                        pickLabel="Choose"
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 4. Details */}
        {childId && chosen && (
          <div className="space-y-4">
            {alreadyAssigned && (
              <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {childName} already has this from you. Assigning it again updates the goal and target date, and you&apos;ll
                see tries logged from now on.
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Goal and note for the family (“For:”)</span>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="e.g. Ask for help with a word or card at snack time" className="rounded-xl" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-800">Area</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} className={selectCls}>
                  <option value="">Use the resource’s area</option>
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-800">Target date (optional)</span>
                <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className={selectCls} />
              </label>
            </div>
            <div className="flex justify-between gap-3">
              {fixedResource ? (
                <span />
              ) : (
                <button type="button" onClick={() => setPicked(null)} className="text-sm font-medium text-gray-600">
                  ← Back to library
                </button>
              )}
              <button
                type="button"
                disabled={assign.isPending}
                onClick={() => assign.mutate()}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {assign.isPending ? 'Assigning…' : `Assign to ${childName}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
