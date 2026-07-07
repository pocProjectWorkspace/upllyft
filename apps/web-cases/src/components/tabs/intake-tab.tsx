'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { useCase } from '@/hooks/use-cases';
import { useIntake, useSaveIntakeDraft, useSummariseIntake } from '@/hooks/use-case-intake';
import type { SaveCaseIntakeInput } from '@/lib/api/case-intake';

const REFERRAL_OPTIONS = [
  'Speech / language',
  'Behaviour',
  'Sensory',
  'Learning',
  'Motor',
  'Emotional',
  'School readiness',
  'Medical',
];
const GOAL_OPTIONS = ['Talk in sentences', 'Follow nursery routines', 'Reduce frustration'];

const CONSENTS: { key: keyof SaveCaseIntakeInput; label: string }[] = [
  { key: 'consentAssessment', label: 'Consent for assessment' },
  { key: 'consentTherapy', label: 'Consent for therapy / intervention' },
  { key: 'consentSharing', label: 'Consent for report sharing' },
  { key: 'consentAi', label: 'Consent for AI-assisted drafting' },
];

// Ordered sections A–F (matches Intake.dc.html scroll-spy order).
const SECTIONS = [
  { id: 'A', label: 'Client & family', title: 'A · Client & family details' },
  { id: 'B', label: 'Referral', title: 'B · Referral & presenting concerns' },
  { id: 'C', label: 'Developmental', title: 'C · Developmental & medical history' },
  { id: 'D', label: 'Family & routine', title: 'D · Family, education & routine' },
  { id: 'E', label: 'Consent', title: 'E · Consent & data-sharing controls' },
  { id: 'F', label: 'Sign-off', title: 'F · Sign-off' },
] as const;

// Free-text fields captured into `data`, grouped by section (A / C / D).
const FIELDS: { section: 'A' | 'C' | 'D'; id: string; label: string; area?: boolean }[] = [
  { section: 'A', id: 'clientName', label: 'Client full name' },
  { section: 'A', id: 'dobAge', label: 'Date of birth / age' },
  { section: 'A', id: 'gender', label: 'Gender' },
  { section: 'A', id: 'languages', label: 'Primary language(s)' },
  { section: 'A', id: 'parent', label: 'Parent / caregiver' },
  { section: 'A', id: 'school', label: 'School / organisation' },
  { section: 'C', id: 'pregnancyBirth', label: 'Pregnancy / birth history', area: true },
  { section: 'C', id: 'medicalDiagnoses', label: 'Medical diagnoses / conditions' },
  { section: 'C', id: 'hearingVision', label: 'Hearing / vision status' },
  { section: 'D', id: 'familyComposition', label: 'Family composition' },
  { section: 'D', id: 'schoolHistory', label: 'School / nursery history' },
];

export function IntakeTab({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { data: caseData } = useCase(caseId);
  const { data: intake, isLoading } = useIntake(caseId);
  const saveDraft = useSaveIntakeDraft(caseId);
  const summarise = useSummariseIntake(caseId);

  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [presentingConcern, setPresentingConcern] = useState('');
  const [urgencyFlag, setUrgencyFlag] = useState('');
  const [referralQuestions, setReferralQuestions] = useState<string[]>([]);
  const [parentGoals, setParentGoals] = useState<string[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({
    consentAssessment: true,
    consentTherapy: true,
    consentSharing: false,
    consentAi: true,
  });
  const [recordedBy, setRecordedBy] = useState('');
  const [activeSec, setActiveSec] = useState<string>('A');

  // Hydrate from server record
  useEffect(() => {
    if (!intake) return;
    setData((intake.data as Record<string, string>) ?? {});
    setPresentingConcern(intake.presentingConcern ?? '');
    setUrgencyFlag(intake.urgencyFlag ?? '');
    setReferralQuestions(intake.referralQuestions ?? []);
    setParentGoals(intake.parentGoals ?? []);
    setConsents({
      consentAssessment: intake.consentAssessment,
      consentTherapy: intake.consentTherapy,
      consentSharing: intake.consentSharing,
      consentAi: intake.consentAi,
    });
    setRecordedBy(intake.recordedBy ?? '');
  }, [intake]);

  const showForm = !!(editing || (intake && intake.state === 'DRAFT'));
  const showSummary = !!(intake && intake.state === 'SUMMARISED' && !editing);
  const isEmpty = !intake && !editing;

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    if (!showForm) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSec(visible[0].target.id.replace('sec-', ''));
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`sec-${s.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [showForm]);

  const payload = (): SaveCaseIntakeInput => ({
    data,
    presentingConcern: presentingConcern || undefined,
    urgencyFlag: urgencyFlag || undefined,
    referralQuestions,
    parentGoals,
    recordedBy: recordedBy || undefined,
    ...(consents as any),
  });

  // Required-field gating for "Complete intake" (Sections A, B, E).
  const missing = useMemo(() => {
    const m: string[] = [];
    if (!presentingConcern.trim()) m.push('Primary concern (B)');
    if (!(data['dobAge'] ?? '').trim()) m.push('Date of birth (A)');
    if (!Object.values(consents).some(Boolean)) m.push('At least one consent (E)');
    return m;
  }, [presentingConcern, data, consents]);
  const canComplete = missing.length === 0;

  const toggle = (list: string[], setList: (v: string[]) => void, v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const jump = (id: string) =>
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const renderFields = (section: 'A' | 'C' | 'D') => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FIELDS.filter((f) => f.section === section).map((f) =>
        f.area ? (
          <textarea
            key={f.id}
            placeholder={f.label}
            value={data[f.id] ?? ''}
            onChange={(e) => setData((d) => ({ ...d, [f.id]: e.target.value }))}
            className="sm:col-span-2 min-h-[72px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        ) : (
          <div key={f.id}>
            <label className="text-[11px] text-gray-500">{f.label}</label>
            <input
              value={data[f.id] ?? ''}
              onChange={(e) => setData((d) => ({ ...d, [f.id]: e.target.value }))}
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
        ),
      )}
    </div>
  );

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />;
  }

  // ── Empty state ──
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
        <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-7 w-7 text-teal-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No intake record yet</h2>
        <p className="text-gray-500 mt-1 max-w-sm mx-auto">
          Capture referral, family, history and consent once — nothing downstream will re-ask the family.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-5 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
        >
          Add client intake details
        </button>
      </div>
    );
  }

  // ── Summary state ──
  if (showSummary) {
    return (
      <div className="space-y-5 max-w-2xl">
        <header>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Client Intake</p>
          <h1 className="text-2xl font-bold text-gray-900">Intake summary</h1>
        </header>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">AI-drafted summary</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{intake!.aiSummary}</p>
        </div>
        {referralQuestions.length > 0 && (
          <Chips label="Referral question" items={referralQuestions} />
        )}
        {parentGoals.length > 0 && <Chips label="Parent goals" items={parentGoals} />}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => router.push(`/${caseId}/triage`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
          >
            Continue to Triage <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View / edit record
          </button>
        </div>
      </div>
    );
  }

  // ── Form state ──
  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Client Intake</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Intake — {(caseData as any)?.child?.firstName ?? 'client'}
        </h1>
      </header>

      {/* Sticky section nav (scroll-spy) */}
      <nav className="sticky top-16 z-10 -mx-4 px-4 py-2 bg-white/95 backdrop-blur border-b border-gray-100 flex gap-1 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeSec === s.id ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="font-semibold">{s.id}</span> · {s.label}
          </button>
        ))}
      </nav>

      {/* Sections A–F in order */}
      {SECTIONS.map((s) => (
        <Section key={s.id} id={`sec-${s.id}`} title={s.title}>
          {s.id === 'A' && renderFields('A')}

          {s.id === 'B' && (
            <>
              <label className="text-[11px] text-gray-500">Primary concern (parent&apos;s words)</label>
              <textarea
                value={presentingConcern}
                onChange={(e) => setPresentingConcern(e.target.value)}
                className="mt-1 mb-3 w-full min-h-[72px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <label className="text-[11px] text-gray-500">Referral question</label>
              <div className="flex flex-wrap gap-2 mt-1 mb-3">
                {REFERRAL_OPTIONS.map((o) => (
                  <ChipToggle key={o} active={referralQuestions.includes(o)} onClick={() => toggle(referralQuestions, setReferralQuestions, o)}>
                    {o}
                  </ChipToggle>
                ))}
              </div>
              <label className="text-[11px] text-gray-500">Urgency / risk flag</label>
              <input
                value={urgencyFlag}
                onChange={(e) => setUrgencyFlag(e.target.value)}
                placeholder="e.g. Low — no red flags"
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
              />
            </>
          )}

          {s.id === 'C' && renderFields('C')}

          {s.id === 'D' && (
            <>
              {renderFields('D')}
              <label className="text-[11px] text-gray-500 block mt-4 mb-1">Parent goals</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((o) => (
                  <ChipToggle key={o} active={parentGoals.includes(o)} onClick={() => toggle(parentGoals, setParentGoals, o)}>
                    {o}
                  </ChipToggle>
                ))}
              </div>
            </>
          )}

          {s.id === 'E' && (
            <div className="space-y-2">
              {CONSENTS.map((c) => (
                <label key={c.key as string} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!consents[c.key as string]}
                    onChange={(e) => setConsents((st) => ({ ...st, [c.key as string]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}

          {s.id === 'F' && (
            <>
              <label className="text-[11px] text-gray-500">Recorded by</label>
              <input
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="mt-1 w-full sm:w-64 h-9 rounded-lg border border-gray-200 px-3 text-sm"
              />
            </>
          )}
        </Section>
      ))}

      {/* Footer actions */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/90 backdrop-blur border-t border-gray-100 flex items-center justify-end gap-3">
        {!canComplete && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" /> Needed to complete: {missing.join(', ')}
          </span>
        )}
        <button
          onClick={() => saveDraft.mutate(payload())}
          disabled={saveDraft.isPending}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          onClick={() => summarise.mutate(payload(), { onSuccess: () => setEditing(false) })}
          disabled={summarise.isPending || !canComplete}
          title={canComplete ? undefined : `Complete: ${missing.join(', ')}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {summarise.isPending ? 'Summarising…' : 'Complete intake'}
        </button>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ChipToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
