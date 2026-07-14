'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/permissions';
import type { FacilityPermission } from '@/lib/api/permissions';
import { Loader2, Lock, ShieldCheck, School, Stethoscope, Eye, ClipboardList } from 'lucide-react';

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
