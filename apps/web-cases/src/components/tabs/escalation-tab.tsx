'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, ArrowLeft, Check, Send, ShieldAlert } from 'lucide-react';
import {
  useEscalations,
  useCreateEscalation,
  useUpdateEscalation,
  useSendReferral,
  useFollowUp,
} from '@/hooks/use-case-escalation';
import type { Escalation, EscalationStatus, IncidentCategory, IncidentUrgency } from '@/lib/api/case-escalation';

const CATEGORIES: { label: string; category: IncidentCategory }[] = [
  { label: 'Medical instability', category: 'MEDICAL_INSTABILITY' },
  { label: 'Seizures', category: 'MEDICAL_INSTABILITY' },
  { label: 'Feeding / swallowing risk', category: 'MEDICAL_INSTABILITY' },
  { label: 'Self-harm', category: 'MENTAL_HEALTH_RISK' },
  { label: 'Abuse / neglect concern', category: 'ABUSE_NEGLECT' },
  { label: 'Severe behavioural risk', category: 'SEVERE_BEHAVIOUR' },
  { label: 'Out-of-scope need', category: 'OUT_OF_SCOPE' },
];
const URGENCIES: { label: string; v: IncidentUrgency }[] = [
  { label: 'Urgent escalation', v: 'URGENT' },
  { label: 'Routine referral', v: 'ROUTINE' },
  { label: 'Emergency', v: 'EMERGENCY' },
];
const TARGETS = ['Doctor / paediatrician', 'Hospital', 'Psychiatrist', 'Neurologist', 'School', 'Social support services', 'Emergency services'];
const SHARE_ITEMS = ['Presenting concern summary', 'Current risk flags', 'Relevant assessment findings', 'Current care plan overview'];

const STATUS: Record<EscalationStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'bg-amber-50 text-amber-700' },
  IN_REVIEW: { label: 'In review', cls: 'bg-amber-50 text-amber-700' },
  ACTION_TAKEN: { label: 'Action taken', cls: 'bg-blue-50 text-blue-700' },
  REFERRAL_SENT: { label: 'Referral sent', cls: 'bg-blue-50 text-blue-700' },
  CONTINUED: { label: 'Continued', cls: 'bg-amber-50 text-amber-700' },
  CLOSED: { label: 'Closed', cls: 'bg-teal-50 text-teal-700' },
};

export function EscalationTab({ caseId }: { caseId: string }) {
  const params = useSearchParams();
  const { data: escalations, isLoading } = useEscalations(caseId);
  const create = useCreateEscalation(caseId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handled = useRef(false);

  // Triage handoff: ?risk=…&urgency=Urgent&source=Triage → auto-create + open
  useEffect(() => {
    if (handled.current) return;
    const risk = params.get('risk');
    if (!risk) return;
    handled.current = true;
    const urgency = params.get('urgency') === 'Urgent' ? 'URGENT' : 'ROUTINE';
    create.mutate(
      { riskLabel: risk, urgency: urgency as IncidentUrgency, source: params.get('source') ?? 'Triage', description: risk },
      { onSuccess: (rec: any) => setSelectedId(rec.id) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (isLoading) return <div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />;
  if (selectedId) return <Workspace caseId={caseId} id={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Referral / Escalation</p>
          <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
        </div>
        <button
          onClick={() => create.mutate({ riskLabel: 'Concern raised', source: 'Therapist' }, { onSuccess: (r: any) => setSelectedId(r.id) })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New escalation
        </button>
      </div>

      {(escalations ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No escalations</p>
          <p className="text-gray-400 text-sm mt-1">Raise a referral or escalation when a concern needs support beyond the current plan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(escalations ?? []).map((e) => (
            <button key={e.id} onClick={() => setSelectedId(e.id)} className="w-full text-left rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-sm hover:border-gray-200 transition-all flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{e.riskLabel || e.description}</p>
                <p className="text-xs text-gray-500">{e.raisedFromModule ? `From ${e.raisedFromModule}` : 'Escalation'} · {new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS[e.status].cls}`}>{STATUS[e.status].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Workspace({ caseId, id, onBack }: { caseId: string; id: string; onBack: () => void }) {
  const { data: escalations } = useEscalations(caseId);
  const rec = escalations?.find((e) => e.id === id);
  const update = useUpdateEscalation(caseId);
  const send = useSendReferral(caseId);
  const followUp = useFollowUp(caseId);
  const [outcome, setOutcome] = useState('');

  if (!rec) return <div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />;
  const patch = (data: any) => update.mutate({ id, data });
  const share = rec.shareScope ?? {};
  const sharedCount = Object.values(share).filter(Boolean).length;
  const canSend = rec.reviewerApproved && rec.consentObtained && sharedCount > 0 && !!rec.referralTarget;
  const sent = rec.status === 'REFERRAL_SENT' || rec.status === 'CLOSED' || rec.status === 'CONTINUED';

  return (
    <div className="space-y-5 max-w-2xl">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> All escalations
      </button>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{rec.riskLabel || 'Escalation'}</h1>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[rec.status].cls}`}>{STATUS[rec.status].label}</span>
      </div>

      {/* Step 1 — Concern & urgency */}
      <Section n={1} title="Concern & urgency" done={!!rec.category && rec.category !== 'OTHER'}>
        <label className="text-[11px] text-gray-500">Risk category</label>
        <div className="flex flex-wrap gap-2 mt-1 mb-3">
          {CATEGORIES.map((c) => (
            <button key={c.label} onClick={() => patch({ category: c.category, riskLabel: c.label })} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${rec.riskLabel === c.label ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <label className="text-[11px] text-gray-500">Urgency</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {URGENCIES.map((u) => (
            <button key={u.v} onClick={() => patch({ urgency: u.v })} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${rec.urgency === u.v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'}`}>
              {u.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Step 2 — Clinical lead review */}
      <Section n={2} title="Clinical lead review" done={rec.reviewerApproved}>
        <label className="text-[11px] text-gray-500">Referral target</label>
        <select value={rec.referralTarget ?? ''} onChange={(e) => patch({ referralTarget: e.target.value })} className="mt-1 mb-3 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white">
          <option value="">Refer to…</option>
          {TARGETS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <textarea defaultValue={rec.reviewerNote ?? ''} onBlur={(e) => patch({ reviewerNote: e.target.value })} placeholder="Short note for the recipient…" className="w-full min-h-[64px] rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3" />
        <Toggle label="Clinical lead / medical practitioner approves this referral" checked={rec.reviewerApproved} onChange={(v) => patch({ reviewerApproved: v })} />
      </Section>

      {/* Step 3 — Consent & minimum-necessary sharing */}
      <Section n={3} title="Consent & minimum-necessary sharing" done={sent}>
        <Toggle label="Parent consent obtained to share externally" checked={rec.consentObtained} onChange={(v) => patch({ consentObtained: v })} />
        <p className="text-[11px] text-gray-500 mt-3 mb-1">Share only what&apos;s necessary</p>
        <div className="space-y-1.5 mb-4">
          {SHARE_ITEMS.map((item) => (
            <Toggle key={item} label={item} checked={!!share[item]} onChange={(v) => patch({ shareScope: { ...share, [item]: v } })} />
          ))}
        </div>
        {sent ? (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"><Check className="h-4 w-4" /> Referral sent</div>
        ) : (
          <button onClick={() => send.mutate(id)} disabled={!canSend || send.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40">
            <Send className="h-4 w-4" /> {send.isPending ? 'Sending…' : 'Send referral'}
          </button>
        )}
      </Section>

      {/* Step 4 — Follow-up */}
      {sent && (
        <Section n={4} title="Follow-up" done={rec.status === 'CLOSED' || rec.status === 'CONTINUED'}>
          <label className="text-[11px] text-gray-500">Did the parent act?</label>
          <div className="flex gap-2 mt-1 mb-4">
            {[['yes', 'Yes — attended'], ['no', 'No — not yet'], ['pending', 'Pending / unknown']].map(([v, l]) => (
              <button key={v} onClick={() => setOutcome(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${outcome === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>{l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => followUp.mutate({ id, outcome, action: 'close' }, { onSuccess: onBack })} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold">Close escalation</button>
            <button onClick={() => followUp.mutate({ id, outcome, action: 'continue' }, { onSuccess: onBack })} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">Continue — needs more follow-up</button>
          </div>
        </Section>
      )}
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600" />
      {label}
    </label>
  );
}
