'use client';

import { Suspense } from 'react';
import { useAuth } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';
import { ResourcesShell } from '@/resources/components/resources-shell';
import { ResourcesHome } from '@/resources/components/resources-home';
import { ResourceJourney } from '@/resources/journey/resource-journey';

/**
 * Parents get the Resources journey (one child at a time: library, their library,
 * progress). Every other role keeps the worksheet / assignment home unchanged.
 */
export default function ResourcesPage() {
  const { user } = useAuth();
  if (user && user.role !== 'USER') return <ResourcesHome />;
  return (
    <ResourcesShell>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={<PageSkeleton />}>
        <ResourceJourney />
      </Suspense>
    </ResourcesShell>
  );
}
