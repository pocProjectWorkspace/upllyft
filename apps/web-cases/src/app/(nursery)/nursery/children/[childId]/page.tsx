'use client';

import { use } from 'react';
import { Badge, Card, Skeleton, useToast } from '@upllyft/ui';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useRoster, useRequestScreeningConsent } from '@/hooks/use-nursery';
import { ConcordanceView } from '@/components/nursery/concordance-view';
import { ObservationTimeline } from '@/components/nursery/observation-timeline';
import { ConcernPanel } from '@/components/nursery/concern-panel';
import { SupportPlanPanel } from '@/components/nursery/support-plan-panel';
import { DevelopmentalReviewPanel } from '@/components/nursery/developmental-review-panel';
import { HandoverPanel } from '@/components/nursery/handover-panel';
import type { RosterChild } from '@/lib/api/nursery';

/**
 * A child, as a NURSERY sees them.
 *
 * There is deliberately no clinical anything here — no case, no diagnosis, no notes.
 * Not because they are hidden, but because a nursery has no route to them: the
 * capability map denies `canDiagnose`/`canCreateCase` and the affiliation is capped
 * at OBSERVATIONS_ONLY, so the API would refuse regardless of what this page asked
 * for. The page reflects that; it does not enforce it.
 *
 * For a consented child this shows the screening entry point, the observation timeline
 * (F5), and the home-vs-nursery concordance (F4). For an unconsented one it shows only
 * what the setting itself entered — the locked state.
 */
export default function NurseryChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { facilityId } = useNursery();
  const { data: roster, isLoading } = useRoster(facilityId ?? undefined);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const child = roster?.find(c => c.childId === childId);

  if (!child) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm text-gray-500">This child isn’t on your roster.</p>
        <a href="/nursery" className="text-sm text-teal-700 font-medium mt-3 inline-block">
          Back to roster
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <a
        href="/nursery"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Roster
      </a>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-lg font-semibold">
          {child.firstName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{child.firstName}</h1>
          <p className="text-sm text-gray-600">
            {child.room?.name ?? 'No room'}
            {child.keyworker ? ` · Keyworker: ${child.keyworker.name}` : ''}
          </p>
        </div>
      </div>

      {!child.consentGranted ? (
        // The locked state. It shows what the NURSERY ITSELF typed in, and nothing
        // that came from the child's record — because there is nothing else we are
        // allowed to show, and pretending otherwise would teach staff to expect data
        // that will never arrive.
        <Card className="p-8">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">
              {child.firstName}’s record is closed
            </h2>
            <p className="text-sm text-gray-600">
              {child.guardian?.name ?? 'Their parent'} hasn’t granted access yet. Everything
              below is what your setting entered — nothing has been shared with you.
            </p>
            <div className="mt-6 w-full text-left space-y-2 text-sm border-t border-gray-100 pt-4">
              <Row label="Date of birth" value={new Date(child.dateOfBirth).toLocaleDateString()} />
              <Row label="Room" value={child.room?.name ?? '—'} />
              <Row label="Keyworker" value={child.keyworker?.name ?? '—'} />
              <Row label="Parent" value={child.guardian?.name ?? '—'} />
              <Row label="Invite sent to" value={child.guardian?.email ?? '—'} />
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-green-900">
                {child.guardian?.name ?? 'Their parent'} has granted access for developmental
                observations. They can withdraw it at any time.
              </span>
            </div>
          </Card>

          <ScreeningCard child={child} />

          <ObservationTimeline childId={child.childId} childName={child.firstName} />

          <ConcordanceView childId={child.childId} childName={child.firstName} />

          <ConcernPanel childId={child.childId} childName={child.firstName} />

          <SupportPlanPanel childId={child.childId} childName={child.firstName} />

          <DevelopmentalReviewPanel childId={child.childId} childName={child.firstName} />

          <HandoverPanel childId={child.childId} childName={child.firstName} />
        </>
      )}
    </div>
  );
}

/**
 * Screening is a SEPARATE permission from observing.
 *
 * A nursery that may note observations still may not run a developmental screening — so
 * this card either offers the screening, or offers to ask. It never quietly does the
 * former on the strength of the latter's consent.
 */
function ScreeningCard({ child }: { child: RosterChild }) {
  const { facilityId } = useNursery();
  const request = useRequestScreeningConsent(facilityId ?? '');
  const { toast } = useToast();

  if (child.screeningConsentGranted) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Developmental check</h2>
            <p className="text-sm text-gray-600 mt-1">
              A short questionnaire about what you see day to day. About 15 minutes.
            </p>
          </div>
          <a
            href={`/nursery/children/${child.childId}/screening`}
            className="shrink-0 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Start
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-dashed">
      <h2 className="font-semibold text-gray-900">Developmental check</h2>
      <p className="text-sm text-gray-600 mt-1">
        {child.guardian?.name ?? 'Their parent'} has agreed you can record observations, but
        a developmental screening is a separate permission — it produces a scored report
        that can be shared with a doctor. You’ll need to ask them.
      </p>
      <button
        onClick={async () => {
          if (!child.affiliationId) return;
          try {
            const r = await request.mutateAsync(child.affiliationId);
            toast({ title: `We’ve asked ${r.sentTo}` });
          } catch (e: any) {
            toast({
              title: e?.response?.data?.message ?? 'Could not send the request',
              variant: 'destructive',
            });
          }
        }}
        disabled={request.isPending}
        className="mt-4 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {request.isPending ? 'Sending…' : 'Ask their parent'}
      </button>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium truncate">{value}</span>
    </div>
  );
}
