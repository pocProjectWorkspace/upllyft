'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  MessageCircle,
  ClipboardList,
  Users,
  Target,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { useCase } from '@/hooks/use-cases';
import { useIntake } from '@/hooks/use-case-intake';
import { useTriageCandidates, useConfirmTriage } from '@/hooks/use-case-triage';
import type {
  TriageDecision,
  TriagePathway,
  ConfirmTriageInput,
} from '@/lib/api/case-triage';

type DecisionKey = 'accept' | 'moreinfo' | 'urgent' | 'oos';
const DECISION_MAP: Record<DecisionKey, TriageDecision> = {
  accept: 'PROCEED',
  moreinfo: 'REQUEST_MORE_INFO',
  urgent: 'URGENT_REFERRAL',
  oos: 'OUT_OF_SCOPE',
};
const DECISIONS: { key: DecisionKey; icon: LucideIcon; label: string; desc: string; color: string }[] = [
  { key: 'accept', icon: CheckCircle2, label: 'Accept for service', desc: 'Suitable — proceed to pathway & allocation', color: '#0EA48B' },
  { key: 'moreinfo', icon: HelpCircle, label: 'Needs more info', desc: 'Hold — request missing details', color: '#E0912E' },
  { key: 'urgent', icon: AlertTriangle, label: 'Urgent referral', desc: 'Red flags — escalate immediately', color: '#E1483C' },
  { key: 'oos', icon: ArrowUpRight, label: 'Out of scope', desc: 'Refer to an external service', color: '#7A8783' },
];

const PATHWAYS: { key: TriagePathway; icon: LucideIcon; label: string; desc: string }[] = [
  { key: 'CONSULTATION_ONLY', icon: MessageCircle, label: 'Consultation only', desc: 'Single advisory session' },
  { key: 'SINGLE_ASSESSMENT', icon: ClipboardList, label: 'Single-discipline assessment', desc: 'One discipline evaluates' },
  { key: 'MDT_ASSESSMENT', icon: Users, label: 'MDT assessment', desc: 'Multiple disciplines together' },
  { key: 'THERAPY_TRIAL', icon: Target, label: 'Therapy trial', desc: 'Trial block before commitment' },
  { key: 'PARENT_COUNSELLING', icon: Handshake, label: 'Parent counselling', desc: 'Guidance for caregivers' },
  { key: 'EXTERNAL_REFERRAL', icon: ArrowUpRight, label: 'External referral', desc: 'Route outside Upllyft' },
];
const APPT_TYPE: Record<TriagePathway, string> = {
  CONSULTATION_ONLY: 'Initial consultation',
  SINGLE_ASSESSMENT: 'Single-discipline assessment',
  MDT_ASSESSMENT: 'MDT assessment',
  THERAPY_TRIAL: 'Therapy trial session',
  PARENT_COUNSELLING: 'Parent counselling session',
  EXTERNAL_REFERRAL: 'External referral',
};
const RISK_FLAGS = [
  'Seizure instability',
  'Swallowing / aspiration risk',
  'Acute mental-health concern',
  'Self-harm indication',
  'Abuse / neglect concern',
  'Medical instability',
];

// "Needs more info" — missing items to request from the parent / referrer.
const INFO_ITEMS = [
  'Previous assessment reports',
  'Medical / diagnosis letter',
  'School observation',
  'Hearing / vision screening',
  'Completed consent forms',
  'Developmental history',
];

// "Out of scope" — external referral targets.
const OOS_TARGETS = [
  'Developmental paediatrician',
  'ENT / audiology',
  'Government early-intervention centre',
  'Other clinic',
];

// Pathway-aware success CTA (label + case sub-route) after an accepted triage.
const SUCCESS_ROUTE: Record<TriagePathway, { label: string; seg: string }> = {
  CONSULTATION_ONLY: { label: 'Continue to Consultation', seg: 'consultation' },
  SINGLE_ASSESSMENT: { label: 'Go to Assessment Reviews', seg: 'reviews' },
  MDT_ASSESSMENT: { label: 'Go to Assessment Reviews', seg: 'reviews' },
  THERAPY_TRIAL: { label: 'Go to Sessions', seg: 'sessions' },
  PARENT_COUNSELLING: { label: 'Go to Sessions', seg: 'sessions' },
  EXTERNAL_REFERRAL: { label: 'Raise referral', seg: 'escalation' },
};

const initials = (n?: string) =>
  (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function TriageTab({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { data: caseData } = useCase(caseId);
  const { data: intake } = useIntake(caseId);
  const { data: candidates } = useTriageCandidates(caseId);
  const confirm = useConfirmTriage(caseId);

  const [decision, setDecision] = useState<DecisionKey | ''>('');
  const [pathway, setPathway] = useState<TriagePathway | ''>('');
  const [primary, setPrimary] = useState('');
  const [secondaries, setSecondaries] = useState<string[]>([]);
  const [schedAt, setSchedAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('Clinic');
  const [channel, setChannel] = useState('app');
  const [requireAck, setRequireAck] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [infoItems, setInfoItems] = useState<Record<string, boolean>>({});
  const [referralTarget, setReferralTarget] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [success, setSuccess] = useState(false);

  const anyFlag = Object.values(flags).some(Boolean);
  const isAccept = decision === 'accept';
  const apptType = pathway ? APPT_TYPE[pathway] : '';
  const canConfirm = isAccept ? !!(pathway && primary && schedAt) : !!decision;

  const toggleSecondary = (id: string) =>
    setSecondaries((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function autoSuggest() {
    const best = candidates?.find((c) => c.bestMatch) ?? candidates?.[0];
    if (best) setPrimary(best.id);
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    const payload: ConfirmTriageInput = {
      decision: DECISION_MAP[decision as DecisionKey],
      riskLevel: anyFlag ? 'HIGH' : 'NONE',
      riskFlags: flags,
      aiSummary: intake?.aiSummary ?? undefined,
      ...(isAccept
        ? {
            pathway: pathway as TriagePathway,
            primaryTherapistId: primary,
            secondaryTherapistIds: secondaries,
            appointment: { type: apptType, scheduledAt: new Date(schedAt).toISOString(), durationMin: duration, location },
            notify: { channel, requireAck },
          }
        : {}),
    };
    await confirm.mutateAsync(payload);
    if (isAccept) setSuccess(true);
    else router.push(`/${caseId}`);
  }

  // "Needs more info" — record the request and hold the case (status → On hold).
  async function handleMoreInfo() {
    await confirm.mutateAsync({
      decision: DECISION_MAP.moreinfo,
      riskLevel: anyFlag ? 'HIGH' : 'NONE',
      riskFlags: flags,
      aiSummary: intake?.aiSummary ?? undefined,
      infoRequested: Object.keys(infoItems).filter((k) => infoItems[k]),
    });
    router.push(`/${caseId}`);
  }

  // "Out of scope" — generate an external referral and close this pathway.
  async function handleOos() {
    await confirm.mutateAsync({
      decision: DECISION_MAP.oos,
      riskLevel: anyFlag ? 'HIGH' : 'NONE',
      riskFlags: flags,
      aiSummary: intake?.aiSummary ?? undefined,
      referralTarget,
      referralReason: referralReason || undefined,
    });
    router.push(`/${caseId}`);
  }

  const childName = (caseData as any)?.child?.firstName ?? 'client';

  if (success) {
    const dest = (pathway && SUCCESS_ROUTE[pathway]) || { label: 'Go to case overview', seg: '' };
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-teal-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Triage confirmed</h2>
        <p className="text-gray-500 mt-1 max-w-md">
          Care team assigned and the first step is booked. {childName}&apos;s next step: {apptType.toLowerCase()}.
        </p>
        <button
          onClick={() => router.push(dest.seg ? `/${caseId}/${dest.seg}` : `/${caseId}`)}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
        >
          {dest.label} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Left rail */}
      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Intake summary
            </p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {intake?.aiSummary ?? 'No intake summary yet. Complete Client Intake first.'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Risk flags
          </p>
          <div className="space-y-1.5">
            {RISK_FLAGS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={!!flags[f]}
                  onChange={(e) => setFlags((s) => ({ ...s, [f]: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-red-600"
                />
                {f}
              </label>
            ))}
          </div>
          {anyFlag && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Risk flag raised
            </div>
          )}
        </div>
      </aside>

      {/* Spine */}
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
            Clinical triage & allocation
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Triage — {childName}</h1>
        </header>

        {/* Step 1 — Decision */}
        <Section n={1} title="Triage decision" done={!!decision}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DECISIONS.map((d) => {
              const active = decision === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setDecision(d.key)}
                  className="text-left p-3 rounded-xl border transition-colors"
                  style={active ? { borderColor: d.color, boxShadow: `inset 0 0 0 1px ${d.color}`, background: `${d.color}0d` } : { borderColor: '#E5E7EB' }}
                >
                  <d.icon className="h-5 w-5" style={{ color: d.color }} />
                  <p className="text-sm font-semibold text-gray-900 mt-1">{d.label}</p>
                  <p className="text-xs text-gray-500">{d.desc}</p>
                </button>
              );
            })}
          </div>

          {decision === 'urgent' && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-4">
              <p className="text-sm text-red-800 mb-2">Red flags require immediate escalation.</p>
              <a
                href={`/${caseId}/escalation?risk=${encodeURIComponent('Urgent concern')}&urgency=Urgent&source=Triage`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4" /> Raise escalation now
              </a>
            </div>
          )}

          {decision === 'moreinfo' && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">Request more information</p>
              <p className="text-xs text-amber-700 mb-3">
                Select what&apos;s missing — a request is sent to the parent / referrer and the case is held in <span className="font-semibold">Awaiting info</span>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                {INFO_ITEMS.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!infoItems[item]}
                      onChange={(e) => setInfoItems((s) => ({ ...s, [item]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600"
                    />
                    {item}
                  </label>
                ))}
              </div>
              <button
                onClick={handleMoreInfo}
                disabled={confirm.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40"
              >
                {confirm.isPending ? 'Sending…' : 'Send request & hold case'}
              </button>
            </div>
          )}

          {decision === 'oos' && (
            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Out of scope — external referral</p>
              <p className="text-xs text-gray-500 mb-3">
                Generate a referral to an external service and close the case with a documented reason.
              </p>
              <label className="text-[11px] text-gray-500">Refer to</label>
              <select
                value={referralTarget}
                onChange={(e) => setReferralTarget(e.target.value)}
                className="mt-1 mb-3 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="">Select a service…</option>
                {OOS_TARGETS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <textarea
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="Reason for referral (documented on the case)…"
                className="w-full min-h-[56px] rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3"
              />
              <button
                onClick={handleOos}
                disabled={!referralTarget || confirm.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-40"
              >
                {confirm.isPending ? 'Generating…' : 'Generate referral & close'}
              </button>
            </div>
          )}
        </Section>

        {/* Accept branch — steps 2–5 */}
        {isAccept && (
          <>
            <Section n={2} title="Care pathway" done={!!pathway}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PATHWAYS.map((p) => {
                  const active = pathway === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPathway(p.key)}
                      className={`text-left p-3 rounded-xl border transition-colors ${active ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p.icon className={`h-5 w-5 ${active ? 'text-teal-600' : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-gray-900 mt-1">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section n={3} title="Assign care team" done={!!primary}>
              <div className="flex justify-end mb-2">
                <button onClick={autoSuggest} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                  Auto-suggest team
                </button>
              </div>
              <div className="space-y-2">
                {(candidates ?? []).map((c) => {
                  const isPrimary = primary === c.id;
                  const caseloadColor = c.caseloadPct > 75 ? '#E1483C' : c.caseloadPct > 60 ? '#E0912E' : '#0EA48B';
                  return (
                    <div key={c.id} className={`rounded-xl border p-3 ${isPrimary ? 'border-teal-500 bg-teal-50/40' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">
                            {initials(c.name)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                              {c.bestMatch && (
                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">Best match</span>
                              )}
                              {c.conflictOfInterest && (
                                <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">⚠ Conflict</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{c.discipline}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPrimary(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isPrimary ? 'bg-teal-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            {isPrimary ? 'Primary' : 'Set primary'}
                          </button>
                          <button
                            onClick={() => toggleSecondary(c.id)}
                            disabled={isPrimary}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${secondaries.includes(c.id) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} disabled:opacity-30`}
                          >
                            {secondaries.includes(c.id) ? 'Secondary' : '+ Secondary'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                        <span>{c.languageMatch ? '✓' : '○'} {c.languageLabel}</span>
                        <span>{c.ageExpertise ? '✓' : '○'} {c.ageLabel}</span>
                        <span>{c.openSlots} slots</span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
                            <span className="block h-full rounded-full" style={{ width: `${c.caseloadPct}%`, background: caseloadColor }} />
                          </span>
                          {c.caseloadPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {candidates && candidates.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">No matching therapists found for this clinic.</p>
                )}
              </div>
            </Section>

            <Section n={4} title="Schedule first step" done={!!schedAt}>
              {pathway && (
                <p className="text-sm text-gray-500 mb-3">
                  Appointment type: <span className="font-medium text-gray-700">{apptType}</span>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] text-gray-500">Date & time</label>
                  <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Duration</label>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white">
                    {[45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Location</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white">
                    <option>Clinic</option>
                    <option>Home visit</option>
                    <option>Teletherapy</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section n={5} title="Inform parent (optional)" done={false}>
              <div className="flex gap-2 mb-3">
                {[['app', 'In-app message'], ['sms', 'SMS'], ['call', 'Phone call']].map(([k, l]) => (
                  <button key={k} onClick={() => setChannel(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${channel === k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={requireAck} onChange={(e) => setRequireAck(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                Require parent acknowledgement before first visit
              </label>
            </Section>
          </>
        )}

        {/* Confirm bar — accept/urgent use this; more-info & out-of-scope have their own CTAs */}
        {decision !== 'moreinfo' && decision !== 'oos' && (
          <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/90 backdrop-blur border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {canConfirm ? 'Ready to confirm.' : 'Complete the decision above to continue.'}
            </p>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || confirm.isPending}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-40"
            >
              {confirm.isPending ? 'Confirming…' : isAccept ? 'Confirm triage & create tasks' : 'Record decision'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${done ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}
