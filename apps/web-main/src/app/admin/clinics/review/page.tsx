'use client';

import { memo, useCallback, useState } from 'react';
import { Badge, Button, Card, Textarea, useToast } from '@upllyft/ui';
import { RowsSkeleton } from '@/components/skeletons';
import { useClinicReviewCounts, useClinicReviewQueue, useSetClinicCompliance } from '@/hooks/use-admin';
import type {
  ClinicComplianceStatus,
  ClinicReviewDecision,
  ClinicReviewItem,
} from '@/lib/api/admin';

/**
 * Clinic approvals (backlog #2). A clinic is listed to families only once it is
 * ACTIVE here AND its owner has it set to public. Therapists' solo practices are
 * approved automatically from their licence verification, so they rarely show up
 * as pending.
 */

type Tab = { key: 'pending' | ClinicComplianceStatus; label: string; status?: ClinicComplianceStatus };

const TABS: Tab[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'ACTIVE', label: 'Approved', status: 'ACTIVE' },
  { key: 'SUSPENDED', label: 'Suspended', status: 'SUSPENDED' },
];

const STATUS_BADGE: Record<ClinicComplianceStatus, { label: string; color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' }> = {
  DRAFT: { label: 'Awaiting review', color: 'gray' },
  IN_REVIEW: { label: 'In review', color: 'yellow' },
  ACTIVE: { label: 'Approved', color: 'green' },
  SUSPENDED: { label: 'Suspended', color: 'red' },
};

const DECISIONS: { status: ClinicReviewDecision; label: string; variant: 'primary' | 'outline' | 'ghost' }[] = [
  { status: 'ACTIVE', label: 'Approve', variant: 'primary' },
  { status: 'IN_REVIEW', label: 'Send back to review', variant: 'ghost' },
  { status: 'SUSPENDED', label: 'Suspend', variant: 'outline' },
];

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function humanise(value: string | null) {
  return value ? value.replace(/_/g, ' ') : null;
}

export default function ClinicReviewPage() {
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const { toast } = useToast();

  const { data: clinics, isLoading, isFetching } = useClinicReviewQueue(tab.status);
  const { data: counts } = useClinicReviewCounts();
  const setCompliance = useSetClinicCompliance();

  const decide = useCallback(
    (clinic: ClinicReviewItem, status: ClinicReviewDecision, note: string) => {
      setCompliance.mutate(
        { id: clinic.id, status, note: note.trim() || undefined },
        {
          onSuccess: () =>
            toast({
              title: status === 'ACTIVE' ? 'Clinic approved' : status === 'SUSPENDED' ? 'Clinic suspended' : 'Sent back to review',
              description:
                status === 'ACTIVE'
                  ? `${clinic.name} can now appear to families${clinic.isPublic ? '' : ' once its owner makes it public'}.`
                  : `${clinic.name} is hidden from families.`,
            }),
          onError: (err: any) =>
            toast({
              title: 'Could not update clinic',
              description: err?.response?.data?.message || err?.message,
              variant: 'destructive',
            }),
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCompliance.mutate, toast],
  );

  const tabCount = (t: Tab) => (!counts ? undefined : t.key === 'pending' ? counts.pending : counts[t.key]);
  const pendingId = setCompliance.isPending ? setCompliance.variables?.id : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinic approvals</h1>
        <p className="text-gray-500 mt-1">
          Clinics appear to families only after Upllyft approves them. Solo practices are approved automatically when
          the therapist&apos;s licence is verified.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-100" role="tablist">
        {TABS.map((t) => {
          const active = t.key === tab.key;
          const n = tabCount(t);
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {n !== undefined && (
                <span className={`ml-2 text-xs ${active ? 'text-teal-600' : 'text-gray-400'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <RowsSkeleton rows={4} />
      ) : !clinics?.length ? (
        <Card className="p-10 text-center text-gray-400">
          {tab.key === 'pending' ? 'No clinics are waiting for review.' : 'No clinics in this state.'}
        </Card>
      ) : (
        <div className={`space-y-3 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          {clinics.map((clinic) => (
            <ClinicReviewRow key={clinic.id} clinic={clinic} busy={pendingId === clinic.id} onDecide={decide} />
          ))}
        </div>
      )}
    </div>
  );
}

const ClinicReviewRow = memo(function ClinicReviewRow({
  clinic,
  busy,
  onDecide,
}: {
  clinic: ClinicReviewItem;
  busy: boolean;
  onDecide: (clinic: ClinicReviewItem, status: ClinicReviewDecision, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const badge = STATUS_BADGE[clinic.complianceStatus];

  const licence = [clinic.licenseNo, humanise(clinic.licenseAuthority), humanise(clinic.emirate)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="p-5">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-900 truncate">{clinic.name}</h2>
            <Badge color={badge.color}>{badge.label}</Badge>
            {clinic.isSoloPractice && <Badge color="purple">Solo practice</Badge>}
            {!clinic.isPublic && <Badge color="gray">Hidden by owner</Badge>}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500">Admin</dt>
              <dd className="text-gray-800 truncate">
                {clinic.admin ? `${clinic.admin.name || 'Unnamed'} (${clinic.admin.email})` : '—'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Organisation</dt>
              <dd className="text-gray-800 truncate">{clinic.organization?.name || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Licence</dt>
              <dd className="text-gray-800 truncate">{licence || 'Not provided'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Country</dt>
              <dd className="text-gray-800">{clinic.country || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Therapists</dt>
              <dd className="text-gray-800">{clinic.therapistCount}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-800">
                {formatDate(clinic.createdAt)}
                {clinic.complianceReviewedAt && (
                  <span className="text-gray-500"> · approved {formatDate(clinic.complianceReviewedAt)}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-2 lg:w-64 shrink-0">
          {DECISIONS.filter((d) => d.status !== clinic.complianceStatus).map((d) => (
            <Button
              key={d.status}
              variant={d.variant}
              size="sm"
              disabled={busy}
              onClick={() => onDecide(clinic, d.status, note)}
            >
              {d.label}
            </Button>
          ))}
          {!showNote && (
            <button
              type="button"
              className="text-xs text-teal-700 hover:underline self-start"
              onClick={() => setShowNote(true)}
            >
              Add a note
            </button>
          )}
        </div>
      </div>

      {showNote && (
        <Textarea
          className="mt-4"
          rows={2}
          maxLength={2000}
          placeholder="Optional note for the audit log (why approved, what is missing…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </Card>
  );
});
