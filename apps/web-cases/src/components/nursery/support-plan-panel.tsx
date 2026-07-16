'use client';

import { useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import { Target, Plus, Send, ChevronDown, ChevronRight, Home, Building2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNursery } from './nursery-context';
import {
  useSupportPlans,
  useCreateSupportPlan,
  useUpdateSupportPlan,
  useAddOutcome,
  useUpdateOutcome,
  useAddIntervention,
  useAddReview,
  useShareSupportPlan,
} from '@/hooks/use-nursery';
import {
  DEVELOPMENTAL_DOMAINS,
  type SupportPlan,
  type SupportOutcome,
  type ReviewDecision,
} from '@/lib/api/nursery';

const domainLabel = (id: string) => DEVELOPMENTAL_DOMAINS.find(d => d.id === id)?.label ?? id;

const statusBadge = (s: SupportPlan['status']) =>
  ({
    DRAFT: <Badge color="yellow">Draft</Badge>,
    ACTIVE: <Badge color="blue">Active</Badge>,
    UNDER_REVIEW: <Badge color="purple">In review</Badge>,
    CLOSED: <Badge color="gray">Closed</Badge>,
  })[s];

const outcomeStatusColor: Record<SupportOutcome['status'], 'gray' | 'yellow' | 'green'> = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'yellow',
  ACHIEVED: 'green',
  DISCONTINUED: 'gray',
};

/**
 * In-setting support plans (F7) + interventions (F8), for the inclusion lead.
 *
 * Like the concern panel, this hides itself entirely if the API refuses the list — a plain
 * keyworker isn't the one who plans support, so they don't see it. It turns a shared concern
 * into a concrete plan: a few targeted outcomes, the interventions being tried for each
 * (in the setting and at home), and review cycles that decide what happens next.
 */
export function SupportPlanPanel({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const { data: plans, isLoading, isError } = useSupportPlans(facilityId ?? undefined, childId);
  const [creating, setCreating] = useState(false);

  if (isError) return null; // 403 = not your job → hide
  if (isLoading) return <Skeleton className="h-28 w-full" />;

  const list = plans ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Support plans</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            What the nursery is putting in place for {childName} — planned with you, reviewed over time.
          </p>
        </div>
        {!creating && (
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New plan
          </Button>
        )}
      </div>

      {creating && (
        <CreatePlanForm
          facilityId={facilityId ?? ''}
          childId={childId}
          childName={childName}
          onDone={() => setCreating(false)}
        />
      )}

      {list.length === 0 && !creating ? (
        <p className="text-sm text-gray-500 mt-5">
          No support plan yet. When you’ve noticed something worth acting on — often after a concern —
          open a plan to set a few small outcomes and the steps you’ll try.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map(p => (
            <PlanCard key={p.id} plan={p} childId={childId} childName={childName} facilityId={facilityId ?? ''} />
          ))}
        </div>
      )}
    </Card>
  );
}

function CreatePlanForm({
  facilityId,
  childId,
  childName,
  onDone,
}: {
  facilityId: string;
  childId: string;
  childName: string;
  onDone: () => void;
}) {
  const create = useCreateSupportPlan(facilityId, childId);
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<string>(DEVELOPMENTAL_DOMAINS[2].id);
  const [outcomeText, setOutcomeText] = useState('');

  const submit = async () => {
    try {
      await create.mutateAsync({
        title: title.trim(),
        domains: [domain],
        outcomes: outcomeText.trim() ? [{ domain, outcomeText: outcomeText.trim() }] : undefined,
      });
      toast({ title: 'Plan created — add a summary and share it when ready' });
      onDone();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? 'Could not create the plan', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg space-y-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={`Plan name — e.g. “Settling & early talk” for ${childName}`}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex gap-2">
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {DEVELOPMENTAL_DOMAINS.map(d => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        <input
          value={outcomeText}
          onChange={e => setOutcomeText(e.target.value)}
          placeholder="First outcome (optional) — what you’d like to see"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button onClick={submit} disabled={!title.trim() || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create plan'}
        </Button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  childId,
  childName,
  facilityId,
}: {
  plan: SupportPlan;
  childId: string;
  childName: string;
  facilityId: string;
}) {
  const update = useUpdateSupportPlan(facilityId, childId);
  const share = useShareSupportPlan(facilityId, childId);
  const addOutcome = useAddOutcome(facilityId, childId);
  const { toast } = useToast();

  const [open, setOpen] = useState(plan.status === 'DRAFT' || plan.status === 'ACTIVE');
  const [summary, setSummary] = useState(plan.summary ?? '');
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const isDraft = plan.status === 'DRAFT';
  const isClosed = plan.status === 'CLOSED';

  const err = (e: any, fallback: string) =>
    toast({ title: e?.response?.data?.message ?? fallback, variant: 'destructive' });

  const saveSummary = async () => {
    try {
      await update.mutateAsync({ planId: plan.id, data: { summary } });
      setSummaryDirty(false);
      toast({ title: 'Saved' });
    } catch (e) {
      err(e, 'Could not save');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <Target className="w-4 h-4 text-teal-600" />
        <span className="font-medium text-gray-900">{plan.title}</span>
        <span className="ml-auto flex items-center gap-2">
          {plan.reviewDate && !isClosed && (
            <span className="text-xs text-gray-400">
              review by {new Date(plan.reviewDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </span>
          )}
          {statusBadge(plan.status)}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Parent-facing summary (required before sharing). */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              {isDraft ? 'Summary for the parent — shared when you send the plan' : `Shared with ${childName}’s parent`}
            </p>
            {isDraft ? (
              <textarea
                value={summary}
                onChange={e => { setSummary(e.target.value); setSummaryDirty(true); }}
                rows={3}
                placeholder="A short, plain description of what you’re doing and why."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap p-3 rounded-lg bg-gray-50 border border-gray-100">
                {plan.summary}
              </p>
            )}
            {isDraft && summaryDirty && (
              <div className="flex justify-end mt-2">
                <Button variant="ghost" onClick={saveSummary} disabled={update.isPending}>Save summary</Button>
              </div>
            )}
          </div>

          {/* Outcomes + their interventions. */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-600">Outcomes</p>
            {plan.outcomes.length === 0 && (
              <p className="text-xs text-gray-400">No outcomes yet.</p>
            )}
            {plan.outcomes.map(o => (
              <OutcomeRow key={o.id} outcome={o} planId={plan.id} childId={childId} facilityId={facilityId} readOnly={isClosed} />
            ))}
            {!isClosed && (
              <AddOutcomeInline
                onAdd={async (domain, text) => {
                  try {
                    await addOutcome.mutateAsync({ planId: plan.id, data: { domain, outcomeText: text } });
                  } catch (e) { err(e, 'Could not add outcome'); }
                }}
                pending={addOutcome.isPending}
              />
            )}
          </div>

          {/* Review history. */}
          {plan.reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Reviews</p>
              {plan.reviews.map(r => (
                <div key={r.id} className="text-xs text-gray-600 flex items-start gap-2">
                  <RefreshCw className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                  <span>
                    <span className="font-medium">{r.decision.toLowerCase()}</span>
                    {' · '}{new Date(r.reviewedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    {r.progressNote ? ` — ${r.progressNote}` : ''}
                    {r.sharedWithParent && <span className="text-teal-600"> · shared</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions. */}
          {!isClosed && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-50">
              {!isDraft && (
                <Button variant="outline" onClick={() => setReviewing(true)}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Review
                </Button>
              )}
              {isDraft && (
                <Button
                  onClick={async () => {
                    try {
                      if (summaryDirty) await update.mutateAsync({ planId: plan.id, data: { summary } });
                      await share.mutateAsync(plan.id);
                      toast({ title: `Shared with ${childName}’s parent` });
                    } catch (e) { err(e, 'Could not share'); }
                  }}
                  disabled={share.isPending || !summary.trim()}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Share with parent
                </Button>
              )}
            </div>
          )}

          {reviewing && (
            <ReviewForm
              plan={plan}
              facilityId={facilityId}
              childId={childId}
              onDone={() => setReviewing(false)}
            />
          )}

          {plan.parentResponse && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs font-medium text-green-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {childName}’s parent replied
              </p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{plan.parentResponse}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutcomeRow({
  outcome,
  planId,
  childId,
  facilityId,
  readOnly,
}: {
  outcome: SupportOutcome;
  planId: string;
  childId: string;
  facilityId: string;
  readOnly: boolean;
}) {
  const updateOutcome = useUpdateOutcome(facilityId, childId);
  const addIntervention = useAddIntervention(facilityId, childId);
  const { toast } = useToast();
  const [adding, setAdding] = useState<null | 'IN_SETTING' | 'HOME'>(null);
  const [ivTitle, setIvTitle] = useState('');

  const setProgress = async (progress: number) => {
    const status = progress >= 100 ? 'ACHIEVED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
    try {
      await updateOutcome.mutateAsync({ planId, outcomeId: outcome.id, data: { currentProgress: progress, status } });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? 'Could not update', variant: 'destructive' });
    }
  };

  const submitIntervention = async () => {
    if (!adding || !ivTitle.trim()) return;
    try {
      await addIntervention.mutateAsync({ planId, outcomeId: outcome.id, data: { kind: adding, title: ivTitle.trim() } });
      setIvTitle(''); setAdding(null);
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? 'Could not add', variant: 'destructive' });
    }
  };

  return (
    <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-2 mb-1.5">
        <Badge color="gray">{domainLabel(outcome.domain)}</Badge>
        <Badge color={outcomeStatusColor[outcome.status]}>{outcome.status.replace('_', ' ').toLowerCase()}</Badge>
        <span className="ml-auto text-xs text-gray-400">{Math.round(outcome.currentProgress)}%</span>
      </div>
      <p className="text-sm text-gray-800">{outcome.outcomeText}</p>
      {outcome.successCriteria && (
        <p className="text-xs text-gray-400 mt-0.5">How we’ll know: {outcome.successCriteria}</p>
      )}

      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
        <div className="h-full bg-teal-500 transition-all" style={{ width: `${outcome.currentProgress}%` }} />
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[0, 25, 50, 75, 100].map(p => (
            <button
              key={p}
              onClick={() => setProgress(p)}
              className="px-2 py-0.5 text-[11px] rounded border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-700"
            >
              {p}%
            </button>
          ))}
        </div>
      )}

      {/* Interventions. */}
      <div className="mt-2 space-y-1">
        {outcome.interventions.map(iv => (
          <div key={iv.id} className="text-xs text-gray-600 flex items-center gap-1.5">
            {iv.kind === 'HOME' ? <Home className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-gray-400" />}
            <span>{iv.title}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{iv.kind === 'HOME' ? 'home' : 'in setting'}</span>
          </div>
        ))}
      </div>

      {!readOnly && (
        adding ? (
          <div className="flex gap-2 mt-2">
            <input
              value={ivTitle}
              onChange={e => setIvTitle(e.target.value)}
              placeholder={adding === 'HOME' ? 'Home strategy for the parent' : 'What staff will do'}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              autoFocus
            />
            <Button variant="ghost" onClick={submitIntervention} disabled={!ivTitle.trim() || addIntervention.isPending}>Add</Button>
            <Button variant="ghost" onClick={() => { setAdding(null); setIvTitle(''); }}>Cancel</Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <button onClick={() => setAdding('IN_SETTING')} className="text-xs text-gray-500 hover:text-teal-700 inline-flex items-center gap-1">
              <Building2 className="w-3 h-3" /> In-setting step
            </button>
            <button onClick={() => setAdding('HOME')} className="text-xs text-gray-500 hover:text-teal-700 inline-flex items-center gap-1">
              <Home className="w-3 h-3" /> Home strategy
            </button>
          </div>
        )
      )}
    </div>
  );
}

function AddOutcomeInline({ onAdd, pending }: { onAdd: (domain: string, text: string) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState<string>(DEVELOPMENTAL_DOMAINS[2].id);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-teal-700 hover:text-teal-800 inline-flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add an outcome
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <select value={domain} onChange={e => setDomain(e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded">
        {DEVELOPMENTAL_DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What you’d like to see"
        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <Button variant="ghost" onClick={() => { if (text.trim()) { onAdd(domain, text.trim()); setText(''); setOpen(false); } }} disabled={!text.trim() || pending}>Add</Button>
    </div>
  );
}

function ReviewForm({
  plan,
  facilityId,
  childId,
  onDone,
}: {
  plan: SupportPlan;
  facilityId: string;
  childId: string;
  onDone: () => void;
}) {
  const addReview = useAddReview(facilityId, childId);
  const { toast } = useToast();
  const [decision, setDecision] = useState<ReviewDecision>('CONTINUE');
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(true);

  const submit = async () => {
    try {
      await addReview.mutateAsync({ planId: plan.id, data: { decision, progressNote: note.trim() || undefined, sharedWithParent: shared } });
      toast({ title: decision === 'CLOSE' ? 'Plan closed' : 'Review recorded' });
      onDone();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? 'Could not record the review', variant: 'destructive' });
    }
  };

  const DECISIONS: { value: ReviewDecision; label: string }[] = [
    { value: 'CONTINUE', label: 'Continue' },
    { value: 'ADJUST', label: 'Adjust' },
    { value: 'ESCALATE', label: 'Refer on' },
    { value: 'CLOSE', label: 'Close' },
  ];

  return (
    <div className="p-4 rounded-lg border border-teal-100 bg-teal-50/50 space-y-3">
      <p className="text-xs font-semibold text-teal-800">Review — how is it going?</p>
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map(d => (
          <button
            key={d.value}
            onClick={() => setDecision(d.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              decision === d.value ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        placeholder="A short note on progress since the last review."
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
        Share this update with the parent
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button onClick={submit} disabled={addReview.isPending}>Record review</Button>
      </div>
    </div>
  );
}
