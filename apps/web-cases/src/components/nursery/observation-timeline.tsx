'use client';

import { useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import { Loader2, Sparkles, Flag, Trophy, StickyNote, Trash2, Plus } from 'lucide-react';
import { useNursery } from './nursery-context';
import { useObservations, useCreateObservation, useDeleteObservation } from '@/hooks/use-nursery';
import { DEVELOPMENTAL_DOMAINS, type Observation, type ObservationType } from '@/lib/api/nursery';

const TYPES: { value: ObservationType; label: string; icon: any; color: any }[] = [
  { value: 'NOTE', label: 'Note', icon: StickyNote, color: 'gray' },
  { value: 'MOMENT', label: 'Nice moment', icon: Sparkles, color: 'green' },
  { value: 'MILESTONE', label: 'Milestone', icon: Trophy, color: 'blue' },
  // A concern is the seed of the coached teacher→parent conversation (F6). It is styled
  // distinctly so a keyworker recording one, and a lead scanning the timeline, both see
  // it as what it is: something to act on, not just a note.
  { value: 'CONCERN', label: 'Concern', icon: Flag, color: 'yellow' },
];

const typeMeta = (t: ObservationType) => TYPES.find(x => x.value === t) ?? TYPES[0];
const domainLabel = (id: string | null) =>
  id ? DEVELOPMENTAL_DOMAINS.find(d => d.id === id)?.label ?? id : null;

export function ObservationTimeline({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const { data: observations, isLoading } = useObservations(facilityId ?? undefined, childId);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Observations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            What you notice day to day. {childName}’s parent can see everything you record.
          </p>
        </div>
      </div>

      <QuickCapture childId={childId} childName={childName} />

      {isLoading ? (
        <div className="space-y-2 mt-5">
          {[0, 1].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (observations ?? []).length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No observations yet. Jot down the first thing you notice about {childName}.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {observations!.map(o => (
            <ObservationRow key={o.id} obs={o} childId={childId} />
          ))}
        </div>
      )}
    </Card>
  );
}

function QuickCapture({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const create = useCreateObservation(facilityId ?? '', childId);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<ObservationType>('NOTE');

  const reset = () => {
    setNote('');
    setDomain('');
    setType('NOTE');
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await create.mutateAsync({
        note: note.trim(),
        domain: domain || undefined,
        type,
      });
      toast({ title: 'Observation saved' });
      reset();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.message ?? 'Could not save the observation',
        variant: 'destructive',
      });
    }
  };

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Record an observation
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded-lg p-4 space-y-3">
      <textarea
        autoFocus
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={`What did you notice about ${childName}?`}
        rows={3}
        maxLength={2000}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />

      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                type === t.value
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Area of development (optional)</option>
          {DEVELOPMENTAL_DOMAINS.map(d => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>

      {type === 'CONCERN' && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2.5 py-2">
          Flagging a concern helps you spot a pattern over time. It doesn’t alarm the
          parent on its own — you decide when and how to raise it with them.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
        <Button type="submit" disabled={create.isPending || !note.trim()}>
          {create.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}

function ObservationRow({ obs, childId }: { obs: Observation; childId: string }) {
  const { facilityId } = useNursery();
  const del = useDeleteObservation(facilityId ?? '', childId);
  const { toast } = useToast();
  const meta = typeMeta(obs.type);
  const Icon = meta.icon;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border ${
        obs.type === 'CONCERN' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon
          className={`w-4 h-4 ${
            obs.type === 'CONCERN'
              ? 'text-amber-600'
              : obs.type === 'MOMENT'
                ? 'text-green-600'
                : obs.type === 'MILESTONE'
                  ? 'text-blue-600'
                  : 'text-gray-400'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{obs.note}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {obs.domain && <Badge color="gray">{domainLabel(obs.domain)}</Badge>}
          <span className="text-xs text-gray-400">
            {new Date(obs.observedAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })}
            {obs.author?.name ? ` · ${obs.author.name}` : ''}
          </span>
        </div>
      </div>

      <button
        onClick={async () => {
          try {
            await del.mutateAsync(obs.id);
          } catch (e: any) {
            toast({
              title: e?.response?.data?.message ?? 'Could not remove it',
              variant: 'destructive',
            });
          }
        }}
        className="shrink-0 text-gray-300 hover:text-red-600 transition-colors self-start"
        aria-label="Remove observation"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
