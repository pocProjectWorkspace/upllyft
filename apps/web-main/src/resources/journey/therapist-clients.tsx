'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, Input, Skeleton, toast, useDebounce } from '@upllyft/ui';
import { journeyApi, type LibraryCard } from './api';
import { journeyKeys } from './hooks';
import { useOpenResource } from './open-resource';
import { ResourceCard } from './resource-card';
import { DOMAINS, DomainBadge, HelpLegend, HelpSquares, StatusPill, formatDay } from './ui';

/**
 * Therapists: the children they work with, what they have assigned each one, and how
 * it is going (only tries logged since the assignment). "Assign a resource" draws on the
 * same merged library parents browse.
 */
export function TherapistClients() {
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: journeyKeys.clients(), queryFn: journeyApi.myClients });
  const [childId, setChildId] = useState<string>('');
  const selectedId = childId || clients.data?.clients[0]?.id || '';
  const selected = clients.data?.clients.find((c) => c.id === selectedId);
  const assigned = useQuery({
    queryKey: journeyKeys.assigned(selectedId),
    queryFn: () => journeyApi.assigned(selectedId),
    enabled: !!selectedId,
  });
  const [picking, setPicking] = useState(false);
  const { open, viewer } = useOpenResource();

  const unassign = useMutation({
    mutationFn: (itemId: string) => journeyApi.unassign(itemId),
    onSuccess: (res) => {
      toast({
        title: 'Removed',
        description: res.removed ? 'It is no longer in the family’s library.' : 'The family keeps the tries they already logged.',
      });
      qc.invalidateQueries({ queryKey: journeyKeys.assigned(selectedId) });
      qc.invalidateQueries({ queryKey: journeyKeys.clients() });
    },
  });

  if (clients.isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  if (!clients.data?.clients.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
        <p className="font-semibold text-gray-900">No clients yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Children appear here once a family has a confirmed booking with you, or you are on their care team.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ul className="space-y-2">
        {clients.data.clients.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setChildId(c.id)}
              className={`w-full rounded-xl border p-3 text-left ${
                c.id === selectedId ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">
                {c.firstName}
                {c.age != null && <span className="font-normal text-gray-500"> · {c.age}y</span>}
              </p>
              <p className="text-xs text-gray-500">
                {c.parent.name ?? 'Parent'} · {c.assignedCount} assigned
                {c.lastActivity ? ` · active ${formatDay(c.lastActivity).toLowerCase()}` : ''}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assigned to {selected?.firstName}</h2>
            <p className="text-sm text-gray-500">You see tries logged since you assigned each one. The rest of their progress stays private unless the family shares it.</p>
          </div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Assign a resource
          </button>
        </div>
        <HelpLegend />

        {assigned.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : !assigned.data?.items.length ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Nothing assigned yet.
          </p>
        ) : (
          <div className="space-y-3">
            {assigned.data.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <DomainBadge domain={item.domain} />
                    <h3 className="mt-1.5 font-semibold text-gray-900">{item.resource?.title ?? 'Resource no longer available'}</h3>
                    {item.goal && <p className="text-sm text-gray-600">◎ For: {item.goal}</p>}
                    {item.targetDate && (
                      <p className="text-xs text-gray-500">Target {new Date(item.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    )}
                    {item.unassigned && <p className="text-xs text-gray-400">No longer assigned</p>}
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
                  <div className="flex items-center gap-3">
                    {item.resource && (
                      <button type="button" onClick={() => open(item.resource!)} className="text-sm font-medium text-teal-700 hover:underline">
                        Open
                      </button>
                    )}
                    {!item.unassigned && (
                      <button type="button" onClick={() => unassign.mutate(item.id)} className="text-sm text-gray-400 hover:text-red-600">
                        Un-assign
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <AssignDialog
          open={picking}
          onClose={() => setPicking(false)}
          childId={selected.id}
          childName={selected.firstName}
          onOpen={open}
        />
      )}
      {viewer}
    </div>
  );
}

function AssignDialog({
  open,
  onClose,
  childId,
  childName,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  onOpen: (card: LibraryCard) => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const search = useDebounce(q, 350);
  const [domain, setDomain] = useState('');
  const [chosen, setChosen] = useState<LibraryCard | null>(null);
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');
  const [area, setArea] = useState('');

  const filters = useMemo(
    () => ({ q: search || undefined, domain: domain || undefined, ageFit: true, limit: 24, childId }),
    [search, domain, childId],
  );
  const library = useQuery({
    queryKey: journeyKeys.assignable(filters),
    queryFn: () => journeyApi.assignable(filters),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const assign = useMutation({
    mutationFn: () =>
      journeyApi.assign(childId, {
        kind: chosen!.kind,
        resourceId: chosen!.id,
        goal: goal.trim() || undefined,
        targetDate: target ? new Date(`${target}T12:00:00`).toISOString() : undefined,
        assignedArea: area || undefined,
      }),
    onSuccess: () => {
      toast({ title: `Assigned to ${childName}`, description: `${chosen?.title} is now in their library.` });
      qc.invalidateQueries({ queryKey: journeyKeys.assigned(childId) });
      qc.invalidateQueries({ queryKey: journeyKeys.clients() });
      setChosen(null);
      setGoal('');
      setTarget('');
      setArea('');
      onClose();
    },
    onError: (e: any) => toast({ title: 'Could not assign', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogTitle className="text-lg font-semibold text-gray-900">
          {chosen ? `Assign “${chosen.title}”` : `Assign a resource to ${childName}`}
        </DialogTitle>

        {!chosen ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input placeholder="Search the library…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 flex-1 rounded-xl" />
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className="h-10 rounded-xl border border-gray-200 px-3 text-sm">
                <option value="">All areas</option>
                {DOMAINS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {library.isLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : !library.data?.items.length ? (
              <p className="py-8 text-center text-sm text-gray-500">Nothing matches. Try another search or area.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {library.data.items.map((card) => (
                  <ResourceCard
                    key={`${card.kind}:${card.id}`}
                    card={card}
                    childName={childName}
                    onOpen={onOpen}
                    onPick={(c) => {
                      setChosen(c);
                      setArea(c.domains[0] ?? '');
                    }}
                    pickLabel="Choose"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Goal for the family (“For:”)</span>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="e.g. Ask for help with a word or card at snack time" className="rounded-xl" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-800">Area</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
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
                <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
              </label>
            </div>
            <div className="flex justify-between gap-3">
              <button type="button" onClick={() => setChosen(null)} className="text-sm font-medium text-gray-600">
                ← Back to library
              </button>
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
