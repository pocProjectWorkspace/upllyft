'use client';

import { use } from 'react';
import { Badge, Card, Skeleton } from '@upllyft/ui';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useRoster } from '@/hooks/use-nursery';

/**
 * A child, as a NURSERY sees them.
 *
 * There is deliberately no clinical anything here — no case, no diagnosis, no notes.
 * Not because they are hidden, but because a nursery has no route to them: the
 * capability map denies `canDiagnose`/`canCreateCase` and the affiliation is capped
 * at OBSERVATIONS_ONLY, so the API would refuse regardless of what this page asked
 * for. The page reflects that; it does not enforce it.
 *
 * Observations themselves are F5. For now this is the consent state and the
 * placement — which is genuinely all a nursery is entitled to before F5 lands.
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

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Observations</h2>
              <Badge color="gray">Coming soon</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Recording day-to-day developmental observations is the next thing we’re
              building. {child.firstName}’s parent has already consented, so it will work
              here the moment it ships.
            </p>
          </Card>
        </>
      )}
    </div>
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
