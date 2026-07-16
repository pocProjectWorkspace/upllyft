'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/permissions';
import type { FacilityPermission } from '@/lib/api/permissions';
import { Loader2, Lock, ShieldCheck, School, Stethoscope, Eye, ClipboardList, Sparkles, Flag, Trophy, StickyNote, MessageCircle, Target, Home } from 'lucide-react';

/**
 * The guardian's control panel: who has asked for access to my child, and what have I
 * actually agreed to?
 *
 * TWO PERMISSIONS, ASKED SEPARATELY, SHOWN SEPARATELY.
 *
 *   Observations (DATA_PROCESSING) — the keyworker may note how the child plays, talks
 *                                    and moves day to day.
 *   Screening    (ASSESSMENT)      — the keyworker may complete a structured
 *                                    developmental questionnaire producing a scored
 *                                    report that can be referred onward.
 *
 * The second is a bigger ask than the first and is NOT implied by it. Presenting them as
 * one switch would mean a parent who agreed to "let them take notes" had, without ever
 * being told, agreed to a scored assessment of their child. So they are two switches,
 * each described in plain words, each independently revocable.
 *
 * Declining is a first-class action here, not a hidden one. A parent who feels cornered
 * into consenting has not consented.
 */

const CONSENTS = [
  {
    type: 'DATA_PROCESSING',
    icon: Eye,
    title: 'Record observations',
    blurb:
      'Their keyworker can note what they see day to day — how your child is playing, talking, moving and getting on with others.',
  },
  {
    type: 'ASSESSMENT',
    icon: ClipboardList,
    title: 'Complete a developmental screening',
    blurb:
      'A structured questionnaire about your child’s development, filled in by their keyworker. It produces a report you can share with a doctor or therapist. It is not a diagnosis.',
  },
] as const;

export default function PermissionsPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const qc = useQueryClient();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', childId],
    queryFn: () => api.getPermissions(childId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['permissions', childId] });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">Who can see your child</h1>
        <p className="text-sm text-gray-600 mt-1.5">
          Nothing is shared unless you say so, and you can change your mind at any time.
        </p>

        <div className="mt-6 space-y-4">
          {(permissions ?? []).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-500">
                No nursery, school or clinic has asked for access to your child.
              </p>
            </div>
          )}

          {(permissions ?? []).map(p => (
            <FacilityCard key={p.facilityId} childId={childId} perm={p} onChange={invalidate} />
          ))}
        </div>

        <ConcernFeed childId={childId} childName="your child" />

        <SupportPlanFeed childId={childId} />
        <ObservationFeed childId={childId} />
      </div>
    </div>
  );
}

function FacilityCard({
  childId,
  perm,
  onChange,
}: {
  childId: string;
  perm: FacilityPermission;
  onChange: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const Icon = perm.facilityType === 'CLINIC' ? Stethoscope : School;

  const grant = useMutation({
    mutationFn: (type: string) =>
      api.grantConsent({ childId, facilityId: perm.facilityId, type, purpose: 'Granted by guardian' }),
    onSuccess: onChange,
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const revoke = useMutation({
    mutationFn: (type: string) => api.revokeConsent(childId, perm.facilityId, type),
    onSuccess: onChange,
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const has = (type: string) => perm.granted.some(g => g.type === type);
  const busy = grant.isPending || revoke.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{perm.facilityName}</p>
          <p className="text-xs text-gray-500">
            {perm.relationship === 'ENROLLED' ? 'Your child attends here' : 'Your child is a patient here'}
          </p>
        </div>
      </div>

      {/*
        The honest current state, stated before the switches. A parent who cannot tell
        what a facility can see right now cannot meaningfully decide what to change.
      */}
      {perm.granted.length === 0 ? (
        <div className="flex gap-2 mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-600">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            They currently see your child’s name on their register and nothing else.
          </span>
        </div>
      ) : (
        <div className="flex gap-2 mt-4 p-3 rounded-lg bg-green-50 text-xs text-green-900">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>You’ve given them {perm.granted.length} of 2 permissions below.</span>
        </div>
      )}

      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      <div className="mt-4 space-y-3">
        {CONSENTS.map(c => {
          const granted = has(c.type);
          const CIcon = c.icon;
          return (
            <div
              key={c.type}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
            >
              <CIcon className={`w-4 h-4 mt-0.5 shrink-0 ${granted ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{c.blurb}</p>
              </div>
              <button
                onClick={() => (granted ? revoke.mutate(c.type) : grant.mutate(c.type))}
                disabled={busy}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  granted
                    ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {busy ? '…' : granted ? 'Withdraw' : 'Allow'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Withdrawing takes effect immediately — they lose access to what they collected.
        Your child’s place is not affected either way.
      </p>
    </div>
  );
}

/**
 * What the nursery has recorded about this child — the guardian's window into the
 * observations. Read-only and always visible to the parent: it is their child, and
 * transparency is the point. A parent who can see exactly what is being noted is a parent
 * who can trust the setting with it.
 */
function ObservationFeed({ childId }: { childId: string }) {
  const { data: observations, isLoading } = useQuery({
    queryKey: ['child-observations', childId],
    queryFn: () => api.getChildObservations(childId),
  });

  if (isLoading || !observations || observations.length === 0) return null;

  const icon = (t: string) =>
    t === 'CONCERN' ? Flag : t === 'MOMENT' ? Sparkles : t === 'MILESTONE' ? Trophy : StickyNote;
  const color = (t: string) =>
    t === 'CONCERN' ? 'text-amber-600' : t === 'MOMENT' ? 'text-green-600' : t === 'MILESTONE' ? 'text-blue-600' : 'text-gray-400';

  const DOMAIN_LABELS: Record<string, string> = {
    grossMotor: 'Gross motor', fineMotor: 'Fine motor', speechLanguage: 'Speech & language',
    socialEmotional: 'Social & emotional', cognitiveLearning: 'Thinking & learning',
    adaptiveSelfCare: 'Self-care', sensoryProcessing: 'Sensory', visionHearing: 'Vision & hearing',
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">What your nursery has noticed</h2>
      <p className="text-sm text-gray-600 mt-1">
        Everything your child’s keyworker records is shown here, as they record it.
      </p>

      <div className="mt-4 space-y-2">
        {observations.map(o => {
          const Icon = icon(o.type);
          return (
            <div
              key={o.id}
              className={`flex gap-3 p-4 rounded-xl border bg-white ${
                o.type === 'CONCERN' ? 'border-amber-200' : 'border-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color(o.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{o.note}</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {o.domain ? `${DOMAIN_LABELS[o.domain] ?? o.domain} · ` : ''}
                  {new Date(o.observedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  {o.facilityName ? ` · ${o.facilityName}` : ''}
                  {o.author?.name ? ` · ${o.author.name}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A concern a nursery has shared about this child (F6). This is a delicate thing to receive
 * as a parent, so it's framed as an invitation, not an alarm — a note from the setting, the
 * chance to reply, and no clinical language (the nursery is barred from diagnosing).
 */
function ConcernFeed({ childId, childName }: { childId: string; childName: string }) {
  const qc = useQueryClient();
  const { data: concerns } = useQuery({
    queryKey: ['child-concerns', childId],
    queryFn: () => api.getChildConcerns(childId),
  });

  if (!concerns || concerns.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">A note from your nursery</h2>
      <div className="mt-4 space-y-3">
        {concerns.map(c => (
          <ConcernNote key={c.id} childId={childId} childName={childName} concern={c} onChange={() => qc.invalidateQueries({ queryKey: ['child-concerns', childId] })} />
        ))}
      </div>
    </div>
  );
}

function ConcernNote({
  childId,
  childName,
  concern,
  onChange,
}: {
  childId: string;
  childName: string;
  concern: api.GuardianConcern;
  onChange: () => void;
}) {
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);

  const ack = useMutation({
    mutationFn: (response?: string) => api.acknowledgeConcern(childId, concern.id, response),
    onSuccess: onChange,
  });

  const acknowledged = concern.status === 'ACKNOWLEDGED' || concern.status === 'CLOSED';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-medium text-gray-900">{concern.facilityName}</span>
        {concern.sharedAt && (
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(concern.sharedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{concern.summary}</p>

      {concern.yourResponse ? (
        <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-1">Your reply</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{concern.yourResponse}</p>
        </div>
      ) : (
        <div className="mt-4">
          {open ? (
            <div className="space-y-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                placeholder="Anything you'd like to say back (optional)…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => ack.mutate(reply.trim() || undefined)}
                  disabled={ack.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  Send
                </button>
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(true)}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
              >
                Reply
              </button>
              <button
                onClick={() => ack.mutate(undefined)}
                disabled={ack.isPending}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {acknowledged ? 'Seen' : 'Mark as seen'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  grossMotor: 'Gross motor',
  fineMotor: 'Fine motor',
  speechLanguage: 'Speech & language',
  socialEmotional: 'Social & emotional',
  cognitiveLearning: 'Thinking & learning',
  adaptiveSelfCare: 'Self-care',
  sensoryProcessing: 'Sensory',
  visionHearing: 'Vision & hearing',
};
const domainLabel = (id: string) => DOMAIN_LABELS[id] ?? id;

function SupportPlanFeed({ childId }: { childId: string }) {
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ['child-support-plans', childId],
    queryFn: () => api.getChildSupportPlans(childId),
  });

  if (!plans || plans.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">Support your nursery is putting in place</h2>
      <div className="mt-4 space-y-3">
        {plans.map(p => (
          <SupportPlanNote
            key={p.id}
            childId={childId}
            plan={p}
            onChange={() => qc.invalidateQueries({ queryKey: ['child-support-plans', childId] })}
          />
        ))}
      </div>
    </div>
  );
}

function SupportPlanNote({
  childId,
  plan,
  onChange,
}: {
  childId: string;
  plan: api.GuardianSupportPlan;
  onChange: () => void;
}) {
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);

  const ack = useMutation({
    mutationFn: (response?: string) => api.acknowledgeSupportPlan(childId, plan.id, response),
    onSuccess: onChange,
  });

  const acknowledged = !!plan.acknowledgedAt;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-medium text-gray-900">{plan.title}</span>
        {plan.facilityName && <span className="text-xs text-gray-400">· {plan.facilityName}</span>}
        {plan.status === 'CLOSED' && <span className="text-xs text-gray-400 ml-auto">completed</span>}
      </div>

      {plan.summary && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{plan.summary}</p>
      )}

      {/* Outcomes with progress, and the strategies to try at home. */}
      {plan.outcomes.length > 0 && (
        <div className="mt-4 space-y-3">
          {plan.outcomes.map(o => (
            <div key={o.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500">{domainLabel(o.domain)}</span>
                <span className="ml-auto text-xs text-gray-400">{Math.round(o.progress)}%</span>
              </div>
              <p className="text-sm text-gray-800">{o.outcomeText}</p>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-teal-500" style={{ width: `${o.progress}%` }} />
              </div>
              {o.homeStrategies.length > 0 && (
                <div className="mt-2 space-y-1">
                  {o.homeStrategies.map(h => (
                    <div key={h.id} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <Home className="w-3 h-3 text-teal-600 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-medium">{h.title}</span>
                        {h.description ? ` — ${h.description}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Latest shared review. */}
      {plan.reviews.length > 0 && plan.reviews[0].progressNote && (
        <p className="mt-3 text-xs text-gray-500 italic">Latest update: {plan.reviews[0].progressNote}</p>
      )}

      {plan.yourResponse ? (
        <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-1">Your reply</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.yourResponse}</p>
        </div>
      ) : (
        <div className="mt-4">
          {open ? (
            <div className="space-y-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                placeholder="Anything you'd like to say back (optional)…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => ack.mutate(reply.trim() || undefined)}
                  disabled={ack.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  Send
                </button>
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(true)}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
              >
                Reply
              </button>
              <button
                onClick={() => ack.mutate(undefined)}
                disabled={ack.isPending}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {acknowledged ? 'Seen' : 'Mark as seen'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
