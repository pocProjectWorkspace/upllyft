'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Minus, Plus, CalendarDays, Lock } from 'lucide-react';
import { useCase } from '@/hooks/use-cases';
import {
  usePricingDefaults,
  useCreateCarePlan,
  useConfirmCarePlan,
  generateScheduleLocal,
} from '@/hooks/use-care-plans';
import { DISCIPLINES, WEEKDAYS, weekdayLabels, disciplineMeta } from '@/lib/disciplines';
import type {
  CarePlanRecommendation,
  CarePlanPaymentStatus,
  TherapyDiscipline,
} from '@/lib/api/care-plans';

// ── Static option sets (from the design spec) ─────────────────────────────
const DOMAINS = [
  'Communication',
  'Sensory & motor',
  'Behaviour',
  'Attention',
  'Social interaction',
  'Emotional',
];
const RATINGS: { key: string; label: string; color: string }[] = [
  { key: 'ok', label: 'Age-appropriate', color: '#0EA48B' },
  { key: 'emerging', label: 'Emerging', color: '#E0912E' },
  { key: 'concern', label: 'Concern', color: '#E1483C' },
];
const RECS: { key: CarePlanRecommendation; emoji: string; label: string }[] = [
  { key: 'NONE', emoji: '👁', label: 'No action — monitor' },
  { key: 'SINGLE_ASSESSMENT', emoji: '📋', label: 'Single-discipline assessment' },
  { key: 'MDT_ASSESSMENT', emoji: '👥', label: 'MDT assessment' },
  { key: 'THERAPY', emoji: '🎯', label: 'Therapy block' },
  { key: 'COACHING', emoji: '🤝', label: 'Parent coaching' },
  { key: 'REFERRAL', emoji: '↗', label: 'Medical / school referral' },
];
const BOOKABLE: CarePlanRecommendation[] = ['THERAPY', 'SINGLE_ASSESSMENT', 'MDT_ASSESSMENT', 'COACHING'];
const PLAN_DISCIPLINES: TherapyDiscipline[] = ['SPEECH', 'OCCUPATIONAL', 'BEHAVIOUR_ABA', 'PSYCHOLOGY'];
const TIMES = ['09:00', '10:00', '16:00', '17:00'];
const PAYMENTS: { key: CarePlanPaymentStatus; label: string }[] = [
  { key: 'PAID', label: 'Paid' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PREAUTH', label: 'Insurance pre-auth' },
];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function ConsultationTab({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { data: caseData } = useCase(caseId);
  const { data: pricing } = usePricingDefaults(caseId);
  const createPlan = useCreateCarePlan(caseId);
  const confirmPlan = useConfirmCarePlan(caseId);

  // ── Wizard state ──
  const [obs, setObs] = useState<Record<string, string>>({});
  const [rec, setRec] = useState<CarePlanRecommendation | ''>('');
  const [disciplines, setDisciplines] = useState<TherapyDiscipline[]>(['SPEECH']);
  const [count, setCount] = useState(12);
  const [days, setDays] = useState<number[]>([1, 4]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('16:00');
  const [unitPrice, setUnitPrice] = useState(1800);
  const [packageName, setPackageName] = useState('');
  const [pay, setPay] = useState<CarePlanPaymentStatus>('PENDING');
  const [reviewInWeeks, setReviewInWeeks] = useState<number | null>(null);
  const [referralTarget, setReferralTarget] = useState('');
  const [planLocked, setPlanLocked] = useState(false);
  const [parentAccept, setParentAccept] = useState(false);
  const [success, setSuccess] = useState<{ sessions: number } | null>(null);

  const needsBooking = rec !== '' && BOOKABLE.includes(rec);
  const ratedCount = Object.keys(obs).length;

  // Apply per-recommendation defaults when a recommendation is chosen
  function chooseRec(key: CarePlanRecommendation) {
    setRec(key);
    setPlanLocked(false);
    const def = pricing?.find((p) => p.recommendation === key);
    if (def) {
      setUnitPrice(def.unitPrice);
      setPackageName(def.label);
      if (def.defaultCount) setCount(def.defaultCount);
      if (def.defaultDays?.length) setDays(def.defaultDays);
    }
    if (key === 'COACHING') setDisciplines(['UNIVERSAL' as TherapyDiscipline]);
    else if (!disciplines.length) setDisciplines(['SPEECH']);
  }

  const schedule = useMemo(
    () => generateScheduleLocal(startDate, days, time, count),
    [startDate, days, time, count],
  );
  const total = unitPrice * count;
  const weeks = days.length ? Math.ceil(count / days.length) : 0;

  const canConfirm =
    ratedCount > 0 &&
    rec !== '' &&
    (!needsBooking || (planLocked && disciplines.length > 0 && count > 0 && days.length > 0)) &&
    parentAccept;

  function toggleDay(n: number) {
    setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));
    setPlanLocked(false);
  }
  function toggleDiscipline(k: TherapyDiscipline) {
    setDisciplines((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
    setPlanLocked(false);
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    const plan = await createPlan.mutateAsync({
      recommendation: rec as CarePlanRecommendation,
      disciplines,
      startDate: new Date(startDate).toISOString(),
      timeOfDay: time,
      daysOfWeek: needsBooking ? days : [],
      sessionCount: needsBooking ? count : 0,
      packageName: packageName || undefined,
      unitPrice: needsBooking ? unitPrice : 0,
      paymentStatus: pay,
      reviewInWeeks: rec === 'NONE' && reviewInWeeks ? reviewInWeeks : undefined,
      externalReferralTarget: rec === 'REFERRAL' ? referralTarget || undefined : undefined,
    });
    const res = await confirmPlan.mutateAsync(plan.id);
    setSuccess({ sessions: res.sessionsCreated });
  }

  const childName = (caseData as any)?.child?.firstName ?? 'this client';

  // ── Success overlay ──
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-teal-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Care plan booked</h2>
        <p className="text-gray-500 mt-1 max-w-md">
          {success.sessions > 0
            ? `${success.sessions} sessions have been created for ${childName} and added to the schedule.`
            : `The plan for ${childName} has been recorded.`}
        </p>
        <div className="flex gap-3 mt-6">
          {success.sessions > 0 && (
            <button
              onClick={() => router.push(`/${caseId}/sessions`)}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
            >
              Go to sessions
            </button>
          )}
          <button
            onClick={() => router.push(`/${caseId}`)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Left rail — carried context */}
      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Carried into this visit
          </p>
          <p className="text-sm font-semibold text-gray-900">{childName}</p>
          <p className="text-xs text-gray-500">{(caseData as any)?.caseNumber}</p>
          {(caseData as any)?.diagnosis && (
            <p className="text-xs text-gray-600 mt-2">{(caseData as any).diagnosis}</p>
          )}
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Presenting concern and history are prefilled from Intake — no need to re-ask the family.
          </p>
        </div>
      </aside>

      {/* Main flow */}
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
            Initial consultation &amp; care plan
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Consultation — {childName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Capture observations, recommend a next step, then build and book the session schedule.
          </p>
        </header>

        {/* Step 1 — Observations */}
        <Section n={1} title="Clinical observations" done={ratedCount > 0}>
          <p className="text-sm text-gray-500 mb-3">Rate each domain from today&apos;s observation.</p>
          <div className="space-y-2">
            {DOMAINS.map((dom) => (
              <div key={dom} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-gray-700 w-40">{dom}</span>
                <div className="flex gap-2">
                  {RATINGS.map((r) => {
                    const active = obs[dom] === r.key;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setObs((o) => ({ ...o, [dom]: r.key }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                        style={
                          active
                            ? { background: r.color, borderColor: r.color, color: '#fff' }
                            : { borderColor: '#E5E7EB', color: '#6B7280' }
                        }
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {ratedCount > 0 && (
            <p className="text-xs text-gray-400 mt-3">{ratedCount} domains rated</p>
          )}
        </Section>

        {/* Step 2 — Recommendation */}
        <Section n={2} title="Recommended next step" done={rec !== ''}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RECS.map((r) => {
              const active = rec === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => chooseRec(r.key)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    active
                      ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">{r.label}</p>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 3 — Care plan (bookable) */}
        {needsBooking && (
          <Section n={3} title="Care plan & sessions" done={planLocked}>
            {/* Disciplines */}
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Discipline(s)
            </label>
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {(rec === 'COACHING' ? DISCIPLINES.filter((d) => d.key === 'UNIVERSAL') : DISCIPLINES.filter((d) => PLAN_DISCIPLINES.includes(d.key))).map((d) => {
                const active = disciplines.includes(d.key);
                return (
                  <button
                    key={d.key}
                    onClick={() => toggleDiscipline(d.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={
                      active
                        ? { background: d.bg, borderColor: d.color, color: d.color }
                        : { borderColor: '#E5E7EB', color: '#6B7280' }
                    }
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sessions stepper */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Number of sessions
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => { setCount((c) => Math.max(1, c - 1)); setPlanLocked(false); }}
                    className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 w-10 text-center">{count}</span>
                  <button
                    onClick={() => { setCount((c) => Math.min(40, c + 1)); setPlanLocked(false); }}
                    className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Days per week */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Days per week
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {WEEKDAYS.map((w) => {
                    const active = days.includes(w.num);
                    return (
                      <button
                        key={w.num}
                        onClick={() => toggleDay(w.num)}
                        className={`h-9 w-11 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {w.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start date */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPlanLocked(false); }}
                  className="mt-2 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>

              {/* Time */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Time
                </label>
                <select
                  value={time}
                  onChange={(e) => { setTime(e.target.value); setPlanLocked(false); }}
                  className="mt-2 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white"
                >
                  {TIMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live generated schedule */}
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-semibold text-gray-900">
                  {schedule.length} sessions
                  {schedule.length > 0 && (
                    <span className="font-normal text-gray-500">
                      {' · '}{fmtDate(schedule[0])} → {fmtDate(schedule[schedule.length - 1])} · {weeks} wks
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {days.length}×/week · {weekdayLabels(days)}
              </p>
              <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {schedule.map((d, i) => (
                  <div key={i} className="text-xs bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
                    <span className="text-gray-400 mr-1">{i + 1}.</span>
                    <span className="text-gray-700">{fmtDate(d)}</span>
                    <span className="text-gray-400 ml-1">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing + payment */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  {packageName || 'Package'} · {count} × {inr(unitPrice)}
                </p>
                <p className="text-lg font-bold text-gray-900">{inr(total)}</p>
              </div>
              <div className="flex gap-2">
                {PAYMENTS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPay(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      pay === p.key
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPlanLocked(true)}
              disabled={planLocked || !days.length || !count}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                planLocked
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40'
              }`}
            >
              <Lock className="h-4 w-4" />
              {planLocked ? 'Plan locked' : 'Lock this plan'}
            </button>
          </Section>
        )}

        {/* Monitor branch */}
        {rec === 'NONE' && (
          <Section n={3} title="Monitoring review" done={reviewInWeeks !== null}>
            <div className="flex gap-2">
              {[4, 8, 12].map((w) => (
                <button
                  key={w}
                  onClick={() => setReviewInWeeks(w)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    reviewInWeeks === w
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Review in {w} weeks
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Referral branch */}
        {rec === 'REFERRAL' && (
          <Section n={3} title="External referral" done={!!referralTarget}>
            <select
              value={referralTarget}
              onChange={(e) => setReferralTarget(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white"
            >
              <option value="">Refer to…</option>
              <option>Developmental paediatrician</option>
              <option>ENT / audiology</option>
              <option>Government early-intervention centre</option>
            </select>
          </Section>
        )}

        {/* Step 4 — Parent summary & booking */}
        <Section n={4} title="Parent summary & booking" done={parentAccept}>
          <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700">Plain-language summary</span>
            </div>
            <p className="text-sm text-gray-700">
              We recommend {RECS.find((r) => r.key === rec)?.label.toLowerCase() ?? 'a next step'} for {childName}.
              {needsBooking && schedule.length > 0 && (
                <> A schedule of {schedule.length} sessions has been prepared, starting {fmtDate(schedule[0])}.</>
              )}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={parentAccept}
              onChange={(e) => setParentAccept(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600"
            />
            Parent accepts the plan and schedule today
          </label>
        </Section>

        {/* Confirm bar */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/90 backdrop-blur border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {canConfirm ? 'Ready to sign & book.' : 'Complete the steps above to continue.'}
          </p>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || createPlan.isPending || confirmPlan.isPending}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-40"
          >
            {createPlan.isPending || confirmPlan.isPending ? 'Booking…' : 'Sign note & book plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
            done ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}
