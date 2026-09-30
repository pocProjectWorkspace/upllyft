'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageSkeleton } from '@upllyft/ui';
import { AdminShell } from '@/clinic/components/admin-shell';
import { PracticeSetupPrompt } from '@/clinic/components/practice-setup-prompt';
import { useClinicAccess } from '@/clinic/lib/use-clinic-access';

/** Linkable entry to practice setup (e.g. from the therapist dashboard). */
export default function PracticeSetupPage() {
  const router = useRouter();
  const { needsPractice, isLoading } = useClinicAccess();

  // Already in a clinic (or not a therapist) — nothing to set up.
  useEffect(() => {
    if (!isLoading && !needsPractice) router.replace('/clinic');
  }, [isLoading, needsPractice, router]);

  return <AdminShell>{needsPractice ? <PracticeSetupPrompt /> : <PageSkeleton />}</AdminShell>;
}
