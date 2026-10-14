'use client';

import { Suspense } from 'react';
import { PageSkeleton } from '@upllyft/ui';
import { ResourcesShell } from '@/resources/components/resources-shell';
import { useParentJourneyRedirect } from '@/resources/journey/parent-redirect';
import { MyLibrary } from '@/resources/my-library/my-library';

/** Therapist My Library: Your Resources (saved) and Create New, behind one toggle. */
export default function MyLibraryPage() {
  // Parents have their own library inside the Resources journey.
  const isParent = useParentJourneyRedirect('mine');
  if (isParent) return null;
  return (
    <ResourcesShell>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={<PageSkeleton />}>
        <MyLibrary />
      </Suspense>
    </ResourcesShell>
  );
}
