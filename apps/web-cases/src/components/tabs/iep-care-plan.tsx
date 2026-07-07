'use client';

import { useState } from 'react';
import { X, Plus, CalendarDays, Check } from 'lucide-react';
import { useCarePlans, useCreateCarePlan, useConfirmCarePlan } from '@/hooks/use-care-plans';
import { useTriageCandidates } from '@/hooks/use-case-triage';
import { disciplineMeta } from '@/lib/disciplines';
import type { TherapyDiscipline } from '@/lib/api/care-plans';

// Care-plan creator disciplines (Goals.dc.html §7c).
const CREATOR_TYPES: TherapyDiscipline[] = [
  'SPEECH',
  'OCCUPATIONAL',
  'PSYCHOLOGY',
  'BEHAVIOUR_ABA',
  'SPECIAL_EDUCATION',
];
const FREQ = [
  { k: '1x', label: '1×/week', days: [1] },
  { k: '2x', label: '2×/week', days: [1, 4] },
  { k: '3x', label: '3×/week', days: [1, 3, 5] },
];
const DURATIONS = ['30', '45', '60'];
const MODES = ['In-person', 'Teletherapy', 'Hybrid'];
const timeForDuration = (d: string) => (d === '30' ? '15:30' : d === '60' ? '16:00' : '15:45');
const SESSIONS_PER_BLOCK = 8;

export function IepCarePlanSection({
  caseId,
  iepId,
  reviewDate,
}: {
  caseId: string;
  iepId: string;
  reviewDate?: string | null;
}) {
  const { data: plans } = useCarePlans(caseId);
  const create = useCreateCarePlan(caseId);
  const confirm = useConfirmCarePlan(caseId);
  const { data: candidates } = useTriageCandidates(caseId);
  const iepPlans = ((plans as any[]) ?? []).filter((p) => p.iepId === iepId);

  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<TherapyDiscipline[]>([]);
  const [freq, setFreq] = useState('2x');
  const [duration, setDuration] = useState('45');
  const [mode, setMode] = useState('In-person');
  const [owner, setOwner] = useState('');
  const [rev, setRev] = useState(reviewDate ? String(reviewDate).slice(0, 10) : '');
  const [home, setHome] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const canCreate = types.length > 0 && !!freq && !!duration && !!mode && !!owner;

  const toggleType = (t: TherapyDiscipline) =>
    setTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const reset = () => {
    setTypes([]);
    setFreq('2x');
    setDuration('45');
    setMode('In-person');
    setOwner('');
    setHome('');
    setOutcomes('');
    setDoneCount(0);
  };

  async function submit() {
    if (!canCreate) return;
    const f = FREQ.find((x) => x.k === freq)!;
    setBusy(true);
    let created = 0;
    try {
      for (const disc of types) {
        const plan: any = await create.mutateAsync({
          recommendation: 'THERAPY',
          disciplines: [disc],
          primaryTherapistId: owner || undefined,
          startDate: new Date().toISOString(),
          timeOfDay: timeForDuration(duration),
          daysOfWeek: f.days,
          sessionCount: SESSIONS_PER_BLOCK,
          packageName: `${disciplineMeta(disc).label} block`,
          paymentStatus: 'PENDING',
          iepId,
          mode,
          sessionDurationMin: Number(duration),
          parentHomeProgram: home || undefined,
          expectedOutcomes: outcomes || undefined,
          reviewDate: rev ? new Date(rev).toISOString() : undefined,
        });
        await confirm.mutateAsync(plan.id);
        created++;
      }
      setDoneCount(created);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Care plan(s)</h3>
        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
        >
          <Plus className="h-3.5 w-3.5" /> {iepPlans.length ? 'Add another block' : 'Create care plan'}
        </button>
      </div>

      {iepPlans.length === 0 ? (
        <p className="text-xs text-gray-400">
          No care plan yet. Create one to book a recurring session block per therapy type.
        </p>
      ) : (
        <div className="space-y-2">
          {iepPlans.map((p) => {
            const m = disciplineMeta(p.disciplines?.[0]);
            return (
              <div key={p.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
                    {m.label}
                  </span>
                  <span className="text-xs text-gray-500">{p.sessionCount} sessions</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span>Duration: {p.sessionDurationMin ?? '—'} min</span>
                  <span>Mode: {p.mode ?? '—'}</span>
                  <span>Review: {p.reviewDate ? String(p.reviewDate).slice(0, 10) : '—'}</span>
                  <span>Status: {p.status}</span>
                </div>
                {(p.parentHomeProgram || p.expectedOutcomes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {p.parentHomeProgram && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Parent home program</p>
                        <p className="text-xs text-gray-600">{p.parentHomeProgram}</p>
                      </div>
                    )}
                    {p.expectedOutcomes && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Expected outcomes</p>
                        <p className="text-xs text-gray-600">{p.expectedOutcomes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <a href={`/${caseId}/sessions`} className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700">
            <CalendarDays className="h-3.5 w-3.5" /> View sessions
          </a>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Create care plan</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {doneCount > 0 ? (
              <div className="text-center py-6">
                <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-7 w-7 text-teal-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Care plan created</p>
                <p className="text-xs text-gray-500 mt-1">
                  {doneCount} block{doneCount === 1 ? '' : 's'} booked ({SESSIONS_PER_BLOCK} sessions each).
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                    Back to IEP
                  </button>
                  <a href={`/${caseId}/sessions`} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold">
                    Go to Sessions
                  </a>
                </div>
              </div>
            ) : (
              <>
                <label className="text-[11px] text-gray-500">Therapy type(s)</label>
                <div className="flex flex-wrap gap-2 mt-1 mb-3">
                  {CREATOR_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${types.includes(t) ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600'}`}
                    >
                      {disciplineMeta(t).label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[11px] text-gray-500">Frequency</label>
                    <div className="flex gap-1.5 mt-1">
                      {FREQ.map((f) => (
                        <button key={f.k} onClick={() => setFreq(f.k)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${freq === f.k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Session duration</label>
                    <div className="flex gap-1.5 mt-1">
                      {DURATIONS.map((d) => (
                        <button key={d} onClick={() => setDuration(d)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${duration === d ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Mode</label>
                    <div className="flex gap-1.5 mt-1">
                      {MODES.map((mo) => (
                        <button key={mo} onClick={() => setMode(mo)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${mode === mo ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                          {mo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[11px] text-gray-500">Therapist owner</label>
                    <select value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white">
                      <option value="">Choose owner…</option>
                      {((candidates as any[]) ?? []).map((c) => (
                        <option key={c.id} value={c.userId ?? c.id}>
                          {c.name} · {c.discipline}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Review date</label>
                    <input type="date" value={rev} onChange={(e) => setRev(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm" />
                  </div>
                </div>

                <label className="text-[11px] text-gray-500">Parent home program</label>
                <textarea
                  value={home}
                  onChange={(e) => setHome(e.target.value)}
                  placeholder="Daily/weekly activities the family will do between sessions…"
                  className="mt-1 mb-3 w-full min-h-[56px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <label className="text-[11px] text-gray-500">Expected outcomes</label>
                <textarea
                  value={outcomes}
                  onChange={(e) => setOutcomes(e.target.value)}
                  placeholder="What success looks like by the review date…"
                  className="mt-1 mb-4 w-full min-h-[56px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">
                    {types.length} type{types.length === 1 ? '' : 's'} · {SESSIONS_PER_BLOCK} sessions each
                  </p>
                  <button
                    onClick={submit}
                    disabled={!canCreate || busy}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40"
                  >
                    {busy ? 'Booking…' : 'Create care plan & book sessions'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
