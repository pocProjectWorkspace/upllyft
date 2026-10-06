'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input, toast } from '@upllyft/ui';
import { JOURNEY_DOMAINS } from '@upllyft/types';
import { updateWorksheet } from '@/resources/lib/api/worksheets';
import { journeyApi } from './api';
import { journeyKeys } from './hooks';
import { Chip } from './ui';

/** Worksheet target-domain values → journey area keys, for pre-filling. */
function toJourneyAreas(worksheetDomains: string[]) {
  return JOURNEY_DOMAINS.filter((d) => d.worksheet && worksheetDomains.includes(d.worksheet)).map((d) => d.key as string);
}

/**
 * Worksheet creation, step "For families": how the worksheet appears in parents'
 * Resources library (areas, ages, duration, "Practises", "For"), and optionally
 * assign it straight to a child the therapist works with.
 */
export function ForFamiliesStep({
  worksheetId,
  defaults,
  onDone,
}: {
  worksheetId: string;
  defaults: { domains: string[]; age?: number | null; durationMinutes?: number | null };
  onDone: () => void;
}) {
  const [areas, setAreas] = useState<string[]>(toJourneyAreas(defaults.domains));
  const [ageMin, setAgeMin] = useState(defaults.age != null ? String(Math.max(0, defaults.age - 1)) : '');
  const [ageMax, setAgeMax] = useState(defaults.age != null ? String(defaults.age + 2) : '');
  const [duration, setDuration] = useState(defaults.durationMinutes ? String(defaults.durationMinutes) : '');
  const [practises, setPractises] = useState('');
  const [forText, setForText] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const clients = useQuery({ queryKey: journeyKeys.clients(), queryFn: journeyApi.myClients });

  const save = useMutation({
    mutationFn: async () => {
      const int = (v: string) => (v.trim() === '' ? undefined : Number(v));
      await updateWorksheet(worksheetId, {
        journeyDomains: areas,
        ageRangeMin: int(ageMin),
        ageRangeMax: int(ageMax),
        durationMinutes: int(duration),
        practises: practises.trim(),
        forText: forText.trim(),
      });
      if (assignTo) await journeyApi.assign(assignTo, { kind: 'WORKSHEET', resourceId: worksheetId, goal: forText.trim() || undefined });
    },
    onSuccess: () => {
      const child = clients.data?.clients.find((c) => c.id === assignTo);
      toast({ title: 'Saved', description: child ? `Assigned to ${child.firstName}.` : 'Families will see it in the Resources library.' });
      onDone();
    },
    onError: (e: any) => toast({ title: 'Could not save', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' }),
  });

  const toggle = (k: string) => setAreas((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">For families</h2>
        <p className="text-sm text-gray-500">How this worksheet shows up in parents’ Resources library. You can skip this.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-800">Areas it practises</p>
        <div className="flex flex-wrap gap-2">
          {JOURNEY_DOMAINS.map((d) => (
            <Chip key={d.key} active={areas.includes(d.key)} onClick={() => toggle(d.key)}>
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-800">Youngest age</span>
          <Input type="number" min={0} max={18} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="rounded-xl" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-800">Oldest age</span>
          <Input type="number" min={0} max={18} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="rounded-xl" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-800">Minutes</span>
          <Input type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-800">Practises</span>
        <Input value={practises} onChange={(e) => setPractises(e.target.value)} maxLength={200} placeholder="e.g. Naming and expressing emotions" className="rounded-xl" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-800">For</span>
        <Input value={forText} onChange={(e) => setForText(e.target.value)} maxLength={200} placeholder="e.g. Children who find big feelings hard to put into words" className="rounded-xl" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-800">Assign now to (optional)</span>
        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
          <option value="">Don’t assign yet</option>
          {clients.data?.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName}
              {c.age != null ? ` (${c.age}y)` : ''} · {c.parent.name ?? 'parent'}
            </option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600">
          Skip
        </button>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : assignTo ? 'Save and assign' : 'Save'}
        </button>
      </div>
    </div>
  );
}
