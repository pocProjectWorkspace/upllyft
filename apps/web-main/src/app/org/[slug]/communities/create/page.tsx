'use client';

// Create Community — guided 5-step wizard (matches the therapist-side flow):
// Basics → Privacy & eligibility → Members & moderators → Guidelines → Review & publish.
// Focus area (from the shared taxonomy) drives eligible specializations + moderator
// "matches focus" hints. Estimated member count is a design-time heuristic.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@upllyft/ui';
import { DEPARTMENTS, DEPARTMENT_OPTIONS, type DepartmentKey } from '@upllyft/types';
import {
  getOrganization,
  getOrgTherapists,
  getMyFacilities,
  createOrgCommunity,
  type OrgTherapistOption,
} from '@/lib/api/organizations';

const STEPS = ['Basics', 'Privacy & eligibility', 'Members & moderators', 'Guidelines', 'Review'] as const;
const DIGEST_OPTIONS = ['Off', 'Daily', 'Weekly'] as const;

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-full text-sm border transition ' +
        (active ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
      }
    >
      {children}
    </button>
  );
}

export default function CreateOrgCommunityWizard() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [therapists, setTherapists] = useState<OrgTherapistOption[]>([]);
  const [branches, setBranches] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [focusArea, setFocusArea] = useState<DepartmentKey | ''>('');
  const [privacy, setPrivacy] = useState<'invite' | 'open'>('open');
  const [eligibleBranches, setEligibleBranches] = useState<string[]>([]);
  const [eligibleSpecializations, setEligibleSpecializations] = useState<string[]>([]);
  const [autoAddMatching, setAutoAddMatching] = useState(true);
  const [moderatorUserIds, setModeratorUserIds] = useState<string[]>([]);
  const [guidelines, setGuidelines] = useState('');
  const [digest, setDigest] = useState<(typeof DIGEST_OPTIONS)[number]>('Weekly');

  useEffect(() => {
    (async () => {
      try {
        const [org, ts] = await Promise.all([getOrganization(slug), getOrgTherapists(slug)]);
        setTherapists(ts);
        try {
          const facs = await getMyFacilities();
          setBranches(facs.filter((f) => f.organizationId === org.id).map((f) => f.name));
        } catch {
          /* branches optional */
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load organization', variant: 'destructive' });
      }
    })();
  }, [slug]);

  // Focus area drives the eligible-specialization list; default to all selected.
  useEffect(() => {
    if (focusArea && DEPARTMENTS[focusArea]) {
      setEligibleSpecializations(DEPARTMENTS[focusArea].specializations);
    } else {
      setEligibleSpecializations([]);
    }
  }, [focusArea]);

  const matchingTherapists = useMemo(
    () => therapists.filter((t) => focusArea && t.department === focusArea),
    [therapists, focusArea],
  );
  const estimatedMembers = matchingTherapists.length; // design-time heuristic

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function submit(publish: boolean) {
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      await createOrgCommunity(slug, {
        name: name.trim(),
        description: description.trim() || undefined,
        focusArea: focusArea || undefined,
        privacy,
        eligibleBranches,
        eligibleSpecializations,
        guidelines: guidelines.trim() || undefined,
        moderatorUserIds,
        autoAddMatching,
        publish,
      });
      toast({ title: publish ? 'Community published' : 'Draft saved' });
      router.push(`/org/${slug}/communities`);
    } catch {
      toast({ title: 'Error', description: 'Failed to create community', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const focusLabel = focusArea ? DEPARTMENTS[focusArea].label : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push(`/org/${slug}/communities`)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
          ← Back to Communities
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Community</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => setStep(i)} className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                (i === step ? 'bg-teal-600 text-white' : i < step ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400')
              }
            >
              {i + 1}
            </span>
            <span className={'text-sm truncate ' + (i === step ? 'font-semibold text-gray-900' : 'text-gray-500')}>{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Step 1 — Basics */}
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Speech & Language Support" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className={inputCls + ' resize-none'} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Focus area</label>
              <select className={inputCls} value={focusArea} onChange={(e) => setFocusArea(e.target.value as DepartmentKey)}>
                <option value="">Select focus area…</option>
                {DEPARTMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Drives eligible specializations and moderator suggestions.</p>
            </div>
          </>
        )}

        {/* Step 2 — Privacy & eligibility */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment</label>
              <div className="flex gap-2">
                <Chip active={privacy === 'open'} onClick={() => setPrivacy('open')}>Open enrollment</Chip>
                <Chip active={privacy === 'invite'} onClick={() => setPrivacy('invite')}>Invite only</Chip>
              </div>
            </div>
            {branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Eligible branches</label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <Chip key={b} active={eligibleBranches.includes(b)} onClick={() => toggle(eligibleBranches, setEligibleBranches, b)}>{b}</Chip>
                  ))}
                </div>
              </div>
            )}
            {focusArea && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Eligible specializations</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS[focusArea].specializations.map((s) => (
                    <Chip key={s} active={eligibleSpecializations.includes(s)} onClick={() => toggle(eligibleSpecializations, setEligibleSpecializations, s)}>{s}</Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Estimated eligible therapists: <span className="font-semibold text-gray-900">≈ {estimatedMembers}</span>
              <span className="text-gray-400"> (design-time estimate)</span>
            </div>
          </>
        )}

        {/* Step 3 — Members & moderators */}
        {step === 2 && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={autoAddMatching} onChange={(e) => setAutoAddMatching(e.target.checked)} />
              Auto-add therapists matching the focus area{focusArea ? ` (${matchingTherapists.length})` : ''}
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moderators</label>
              {therapists.length === 0 ? (
                <p className="text-sm text-gray-400">No therapists in this organization yet.</p>
              ) : (
                <div className="space-y-2">
                  {therapists.map((t) => {
                    const matches = focusArea && t.department === focusArea;
                    const selected = moderatorUserIds.includes(t.userId);
                    return (
                      <label key={t.id} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm">
                        <input type="checkbox" checked={selected} onChange={() => toggle(moderatorUserIds, setModeratorUserIds, t.userId)} />
                        <span className="text-gray-900">{t.name}</span>
                        {matches && <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">Matches focus</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 4 — Guidelines */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community guidelines</label>
              <textarea className={inputCls + ' resize-none'} rows={5} value={guidelines} onChange={(e) => setGuidelines(e.target.value)} placeholder="Shown to new joiners." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Digest notifications</label>
              <select className={inputCls} value={digest} onChange={(e) => setDigest(e.target.value as (typeof DIGEST_OPTIONS)[number])}>
                {DIGEST_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Step 5 — Review */}
        {step === 4 && (
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-gray-500">Name</dt><dd className="col-span-2 text-gray-900">{name || '—'}</dd>
            <dt className="text-gray-500">Focus area</dt><dd className="col-span-2 text-gray-900">{focusLabel}</dd>
            <dt className="text-gray-500">Enrollment</dt><dd className="col-span-2 text-gray-900">{privacy === 'invite' ? 'Invite only' : 'Open enrollment'}</dd>
            <dt className="text-gray-500">Eligible branches</dt><dd className="col-span-2 text-gray-900">{eligibleBranches.length ? eligibleBranches.join(', ') : '—'}</dd>
            <dt className="text-gray-500">Specializations</dt><dd className="col-span-2 text-gray-900">{eligibleSpecializations.length ? eligibleSpecializations.join(', ') : '—'}</dd>
            <dt className="text-gray-500">Auto-add matching</dt><dd className="col-span-2 text-gray-900">{autoAddMatching ? `Yes (${matchingTherapists.length})` : 'No'}</dd>
            <dt className="text-gray-500">Moderators</dt><dd className="col-span-2 text-gray-900">{moderatorUserIds.length || 0}</dd>
            <dt className="text-gray-500">Digest</dt><dd className="col-span-2 text-gray-900">{digest}</dd>
          </dl>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="px-4 py-2 text-sm text-gray-600 disabled:opacity-40">
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
            Continue →
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => submit(false)} disabled={saving} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              Save as draft
            </button>
            <button onClick={() => submit(true)} disabled={saving} className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40">
              {saving ? 'Publishing…' : 'Publish community'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
