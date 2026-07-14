'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Skeleton, useToast } from '@upllyft/ui';
import { Loader2 } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useRoster } from '@/hooks/use-nursery';
import { ScreeningForm } from '@/components/nursery/screening-form';
import * as api from '@/lib/api/nursery';

/** Pick the questionnaire band from the child's age — the API validates it regardless. */
function ageBand(dob: string): string {
  const months = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 16) return '12-15-months';
  if (months < 24) return '16-24-months';
  if (months < 36) return '24-36-months';
  if (months < 48) return '3-4-years';
  if (months < 60) return '4-5-years';
  if (months < 72) return '5-6-years';
  if (months < 96) return '6-8-years';
  return '8-10-years';
}

export default function NurseryScreeningPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { facilityId } = useNursery();
  const { data: roster, isLoading } = useRoster(facilityId ?? undefined);
  const router = useRouter();
  const { toast } = useToast();

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const child = roster?.find(c => c.childId === childId);

  useEffect(() => {
    if (!child || assessmentId || error) return;

    api
      .createScreening(childId, ageBand(child.dateOfBirth))
      .then(a => setAssessmentId(a.id))
      .catch(e => {
        // The gate speaks for itself — e.g. "No active ASSESSMENT consent from the
        // child's guardian." Show it VERBATIM: it tells the keyworker exactly what to do
        // next (go and ask the parent), which a generic "something went wrong" would not.
        setError(e?.response?.data?.message ?? 'Could not start the screening.');
      });
  }, [child, childId, assessmentId, error]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!child) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm text-gray-500">This child isn’t on your roster.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <h1 className="font-semibold text-gray-900">Can’t start this screening</h1>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <a
          href="/nursery"
          className="inline-block mt-5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Back to roster
        </a>
      </Card>
    );
  }

  if (!assessmentId) {
    return <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto my-12" />;
  }

  return (
    <ScreeningForm
      assessmentId={assessmentId}
      childName={child.firstName}
      onDone={() => {
        toast({ title: 'Saved' });
        router.push(`/nursery/children/${childId}`);
      }}
    />
  );
}
