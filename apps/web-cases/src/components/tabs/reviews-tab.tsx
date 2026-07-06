'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Sparkles, Check, Flag, Share2, ClipboardList } from 'lucide-react';
import {
  useAssessmentReviews,
  useAssessmentReview,
  useCreateReview,
  useUpdateReview,
  useAddDiscipline,
  useUpdateDiscipline,
  useDraftReport,
  useShareReport,
} from '@/hooks/use-assessment-reviews';
import { useConsents } from '@/hooks/use-cases';
import { DISCIPLINES, disciplineMeta } from '@/lib/disciplines';
import type { TherapyDiscipline } from '@/lib/api/care-plans';
import type {
  AssessmentReview,
  AssessmentPhase,
  AssessmentExecStatus,
} from '@/lib/api/assessment-reviews';

const CORE: TherapyDiscipline[] = ['SPEECH', 'OCCUPATIONAL', 'PSYCHOLOGY', 'BEHAVIOUR_ABA', 'SPECIAL_EDUCATION', 'PHYSIOTHERAPY'];
const PHASE_LABEL: Record<AssessmentPhase, string> = {
  PLAN: 'Planning',
  EXEC: 'In progress',
  REPORT: 'Ready for MDT review',
  SHARED: 'Report shared',
};
const PHASE_BADGE: Record<AssessmentPhase, string> = {
  PLAN: 'bg-gray-100 text-gray-600',
  EXEC: 'bg-amber-50 text-amber-700',
  REPORT: 'bg-blue-50 text-blue-700',
  SHARED: 'bg-teal-50 text-teal-700',
};
const EXEC_LABEL: Record<AssessmentExecStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
};

export function ReviewsTab({ caseId }: { caseId: string }) {
  const { data: reviews, isLoading } = useAssessmentReviews(caseId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />;
  if (selectedId) return <Workspace caseId={caseId} id={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Assessment Reviews</p>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New assessment
        </button>
      </div>

      {creating && <Creator caseId={caseId} onDone={(id) => { setCreating(false); if (id) setSelectedId(id); }} />}

      {(reviews ?? []).length === 0 && !creating ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No assessments yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a single-discipline or MDT assessment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(reviews ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="text-left rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {r.type === 'MDT' ? 'Multidisciplinary' : 'Single-discipline'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PHASE_BADGE[r.phase]}`}>
                  {PHASE_LABEL[r.phase]}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{r.title || 'Assessment'}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {r.disciplines.map((d) => {
                  const m = disciplineMeta(d.discipline);
                  return (
                    <span key={d.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
                      {m.short}
                    </span>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Creator({ caseId, onDone }: { caseId: string; onDone: (id?: string) => void }) {
  const [type, setType] = useState<'SINGLE' | 'MDT'>('SINGLE');
  const [discs, setDiscs] = useState<TherapyDiscipline[]>(['SPEECH']);
  const create = useCreateReview(caseId);
  const toggle = (d: TherapyDiscipline) =>
    setDiscs((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
      <div className="flex gap-2">
        {(['SINGLE', 'MDT'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${type === t ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
            {t === 'SINGLE' ? 'Single-discipline' : 'Multidisciplinary (MDT)'}
          </button>
        ))}
      </div>
      <div>
        <label className="text-[11px] text-gray-500">Disciplines in scope</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {DISCIPLINES.filter((d) => CORE.includes(d.key)).map((d) => (
            <button key={d.key} onClick={() => toggle(d.key)} className="px-3 py-1.5 rounded-full text-xs font-medium border" style={discs.includes(d.key) ? { background: d.bg, borderColor: d.color, color: d.color } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
              {d.short}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => onDone()} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">Cancel</button>
        <button
          disabled={!discs.length || create.isPending}
          onClick={async () => {
            const r = await create.mutateAsync({ type, disciplines: discs, title: `${type === 'MDT' ? 'MDT' : disciplineMeta(discs[0]).short} assessment` });
            onDone((r as any)?.id);
          }}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </div>
  );
}

const PHASES: AssessmentPhase[] = ['PLAN', 'EXEC', 'REPORT'];
const PHASE_TAB: Record<AssessmentPhase, string> = {
  PLAN: 'Plan & schedule',
  EXEC: 'Execution',
  REPORT: 'MDT review & report',
  SHARED: 'Shared',
};

function Workspace({ caseId, id, onBack }: { caseId: string; id: string; onBack: () => void }) {
  const { data: review } = useAssessmentReview(caseId, id);
  const update = useUpdateReview(caseId);
  const [tab, setTab] = useState<AssessmentPhase>('PLAN');

  if (!review) return <div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />;

  const activeTab = tab;
  const setPhase = (p: AssessmentPhase) => update.mutate({ id, data: { phase: p } });

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> All assessments
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{review.title || 'Assessment'}</h1>
        <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${PHASE_BADGE[review.phase]}`}>
          {PHASE_LABEL[review.phase]}
        </span>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => setTab(p)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === p ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {i + 1}. {PHASE_TAB[p]}
          </button>
        ))}
      </div>

      {activeTab === 'PLAN' && <PlanPhase caseId={caseId} review={review} onNext={() => { setPhase('EXEC'); setTab('EXEC'); }} />}
      {activeTab === 'EXEC' && <ExecPhase caseId={caseId} review={review} onNext={() => { setPhase('REPORT'); setTab('REPORT'); }} />}
      {activeTab === 'REPORT' && <ReportPhase caseId={caseId} review={review} />}
    </div>
  );
}

function PlanPhase({ caseId, review, onNext }: { caseId: string; review: AssessmentReview; onNext: () => void }) {
  const update = useUpdateReview(caseId);
  const set = (data: any) => update.mutate({ id: review.id, data });
  return (
    <div className="space-y-4">
      <Section title="Scope">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {review.disciplines.map((d) => {
            const m = disciplineMeta(d.discipline);
            return <span key={d.id} className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
          })}
        </div>
        <Toggle label="Scope approved" checked={review.scopeApproved} onChange={(v) => set({ scopeApproved: v })} />
      </Section>
      <Section title="Parent preparation">
        <Toggle label="Pre-assessment questionnaire sent" checked={review.questionnaireSent} onChange={(v) => set({ questionnaireSent: v })} />
        <Toggle label="School input requested" checked={review.schoolInputRequested} onChange={(v) => set({ schoolInputRequested: v })} />
      </Section>
      <Section title="Payment">
        <div className="flex gap-2">
          {(['PAID', 'PENDING', 'PREAUTH'] as const).map((p) => (
            <button key={p} onClick={() => set({ paymentStatus: p })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${review.paymentStatus === p ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
              {p === 'PREAUTH' ? 'Insurance pre-auth' : p[0] + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </Section>
      <div className="flex justify-end">
        <button onClick={onNext} disabled={!review.scopeApproved} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40">
          Continue to execution
        </button>
      </div>
    </div>
  );
}

function ExecPhase({ caseId, review, onNext }: { caseId: string; review: AssessmentReview; onNext: () => void }) {
  const router = useRouter();
  const updateDisc = useUpdateDiscipline(caseId);
  const addDisc = useAddDiscipline(caseId);
  const [flagOpen, setFlagOpen] = useState<string | null>(null);

  const inScope = new Set(review.disciplines.map((d) => d.discipline));
  const addable = CORE.filter((d) => !inScope.has(d));
  const allSubmitted = review.disciplines.every((d) => d.status === 'SUBMITTED');

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {review.disciplines.filter((d) => d.status === 'SUBMITTED').length} of {review.disciplines.length} disciplines signed off
      </p>
      {review.disciplines.map((d) => {
        const m = disciplineMeta(d.discipline);
        return (
          <div key={d.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="h-1" style={{ background: m.color }} />
            <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{m.label}</p>
                  {d.flagged && <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Flagged</span>}
                </div>
                <span className="text-xs text-gray-500">{EXEC_LABEL[d.status]}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={d.status}
                  onChange={(e) => updateDisc.mutate({ id: review.id, rowId: d.id, data: { status: e.target.value } })}
                  className="h-8 rounded-lg border border-gray-200 px-2 text-xs bg-white"
                >
                  {(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED'] as const).map((s) => (
                    <option key={s} value={s}>{EXEC_LABEL[s]}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (d.status === 'NOT_STARTED') {
                      updateDisc.mutate({ id: review.id, rowId: d.id, data: { status: 'IN_PROGRESS' } });
                    }
                    router.push(`/${caseId}/assessments/new?discipline=${d.discipline}&activity=ASSESSMENT&assessmentReviewId=${review.id}&disciplineRowId=${d.id}`);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  {d.status === 'NOT_STARTED' ? 'Start assessment' : d.status === 'SUBMITTED' ? 'View report' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Flag a concern */}
      {addable.length > 0 && (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
          <button onClick={() => setFlagOpen(flagOpen ? null : 'x')} className="inline-flex items-center gap-2 text-sm font-medium text-amber-700">
            <Flag className="h-4 w-4" /> Flag a concern — add a discipline
          </button>
          {flagOpen && (
            <div className="flex flex-wrap gap-2 mt-3">
              {addable.map((d) => {
                const m = disciplineMeta(d);
                return (
                  <button key={d} onClick={() => { addDisc.mutate({ id: review.id, discipline: d }); setFlagOpen(null); }} className="px-3 py-1.5 rounded-full text-xs font-medium border" style={{ borderColor: m.color, color: m.color }}>
                    + {m.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext} disabled={!allSubmitted} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40">
          Continue to MDT review
        </button>
      </div>
    </div>
  );
}

function ReportPhase({ caseId, review }: { caseId: string; review: AssessmentReview }) {
  const update = useUpdateReview(caseId);
  const draft = useDraftReport(caseId);
  const share = useShareReport(caseId);
  const { data: consents } = useConsents(caseId);
  const hasSharingConsent = (consents ?? []).some((c: any) => c.type === 'REPORT_SHARING' && !c.revokedAt);

  const [recipients, setRecipients] = useState({ parent: true, school: false, doctor: false });
  const approved = review.approval === 'approved';

  return (
    <div className="space-y-4">
      <Section title="Consolidated report">
        <button
          onClick={() => draft.mutate(review.id)}
          disabled={draft.isPending}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold mb-3"
        >
          <Sparkles className="h-4 w-4" /> {draft.isPending ? 'Drafting…' : 'Draft with AI'}
        </button>
        <textarea
          value={review.reportText ?? ''}
          onChange={(e) => update.mutate({ id: review.id, data: { reportText: e.target.value } })}
          placeholder="Consolidated MDT report…"
          className="w-full min-h-[160px] rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
        />
      </Section>

      <Section title="Clinical approval">
        <div className="flex gap-2">
          {[['approved', 'Approve'], ['changes', 'Request changes'], ['rejected', 'Reject']].map(([k, l]) => (
            <button key={k} onClick={() => update.mutate({ id: review.id, data: { approval: k } })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${review.approval === k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Consent-gated sharing">
        {!hasSharingConsent && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            No report-sharing consent on file — external recipients are disabled. Capture it at Client Intake (Section E).
          </p>
        )}
        <div className="space-y-2 mb-3">
          <Toggle label="Parent / caregiver" checked={recipients.parent} onChange={(v) => setRecipients((r) => ({ ...r, parent: v }))} />
          <Toggle label="School" checked={recipients.school} disabled={!hasSharingConsent} onChange={(v) => setRecipients((r) => ({ ...r, school: v }))} />
          <Toggle label="Referring doctor" checked={recipients.doctor} disabled={!hasSharingConsent} onChange={(v) => setRecipients((r) => ({ ...r, doctor: v }))} />
        </div>
        {review.phase === 'SHARED' ? (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
            <Check className="h-4 w-4" /> Report shared
          </div>
        ) : (
          <button
            onClick={() => share.mutate({ id: review.id, recipients })}
            disabled={!approved || !recipients.parent || share.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" /> {share.isPending ? 'Sharing…' : 'Share report'}
          </button>
        )}
        {!approved && <p className="text-[11px] text-gray-400 mt-2">Report must be approved before sharing.</p>}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? 'text-gray-300' : 'text-gray-700'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600" />
      {label}
    </label>
  );
}
