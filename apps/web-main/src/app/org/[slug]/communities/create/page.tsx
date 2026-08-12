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
  getOrgCommunityDetail,
  updateOrgCommunity,
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
  const [editId, setEditId] = useState<string | null>(null);
  useEffect(() => {
    setEditId(new URLSearchParams(window.location.search).get('id'));
  }, []);

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
        let branchNames: string[] = [];
        try {
          const facs = await getMyFacilities();
          branchNames = facs.filter((f) => f.organizationId === org.id).map((f) => f.name);
          setBranches(branchNames);
        } catch {
          /* branches optional */
        }
        if (editId) {
          try {
            const d = await getOrgCommunityDetail(slug, editId);
            setName(d.name);
            setDescription(d.description);
            setFocusArea((d.focusArea as DepartmentKey) || '');
            setPrivacy(d.privacy);
            setGuidelines(d.guidelines);
            setModeratorUserIds(d.moderatorUserIds);
            setAutoAddMatching(false);
            const branchSet = new Set(branchNames);
            setEligibleBranches(d.tags.filter((t) => branchSet.has(t)));
          } catch {
            toast({ title: 'Error', description: 'Failed to load community', variant: 'destructive' });
          }
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load organization', variant: 'destructive' });
      }
    })();
  }, [slug, editId]);

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
      const payload = {
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
      };
      if (editId) {
        await updateOrgCommunity(slug, editId, payload);
        toast({ title: publish ? 'Community updated' : 'Draft saved' });
      } else {
        await createOrgCommunity(slug, payload);
        toast({ title: publish ? 'Community published' : 'Draft saved' });
      }
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
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{editId ? 'Edit Community' : 'New Community'}</h1>
          {!editId && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Draft</span>}
        </div>
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
              <div className="flex flex-wrap gap-2">
                {DEPARTMENT_OPTIONS.map((o) => (
                  <Chip key={o.value} active={focusArea === o.value} onClick={() => setFocusArea(o.value as DepartmentKey)}>{o.label}</Chip>
                ))}
              </div>
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
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-700">Auto-add therapists matching the focus area{focusArea ? ` (${matchingTherapists.length})` : ''}</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoAddMatching}
                onClick={() => setAutoAddMatching(!autoAddMatching)}
                className={'relative w-11 h-6 rounded-full transition-colors shrink-0 ' + (autoAddMatching ? 'bg-teal-600' : 'bg-gray-300')}
              >
                <span className={'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ' + (autoAddMatching ? 'translate-x-5' : '')} />
              </button>
            </div>
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
                      <label key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-2 text-sm">
                        <input type="checkbox" checked={selected} onChange={() => toggle(moderatorUserIds, setModeratorUserIds, t.userId)} />
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}>{t.name.charAt(0)}</span>
                        <span className="flex-1 min-w-0 truncate">
                          <span className="text-gray-900">{t.name}</span>
                          {t.department && DEPARTMENTS[t.department as DepartmentKey] && (
                            <span className="text-gray-400"> · {DEPARTMENTS[t.department as DepartmentKey].label}</span>
                          )}
                        </span>
                        {matches && <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded shrink-0">Matches focus</span>}
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
              <div className="flex gap-2">
                {DIGEST_OPTIONS.map((d) => (
                  <Chip key={d} active={digest === d} onClick={() => setDigest(d)}>{d}</Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 5 — Review */}
        {step === 4 && (
          <div className="space-y-2">
            {([
              ['Name', name || '—'],
              ['Focus area', focusLabel],
              ['Enrollment', privacy === 'invite' ? 'Invite only' : 'Open enrollment'],
              ['Eligible branches', eligibleBranches.length ? eligibleBranches.join(', ') : '—'],
              ['Specializations', eligibleSpecializations.length ? eligibleSpecializations.join(', ') : '—'],
              ['Auto-add matching', autoAddMatching ? `Yes (${matchingTherapists.length})` : 'No'],
              ['Moderators', String(moderatorUserIds.length || 0)],
              ['Digest', digest],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
                <span className="text-gray-500 shrink-0">{k}</span>
                <span className="font-semibold text-gray-900 text-right truncate">{v}</span>
              </div>
            ))}
          </div>
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
