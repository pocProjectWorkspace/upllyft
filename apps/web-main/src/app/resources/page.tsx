'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';
import { ResourcesShell } from '@/resources/components/resources-shell';
import { ResourceJourney } from '@/resources/journey/resource-journey';

/** Professionals' home in Resources is My Library; old links to /resources land there. */
function ToMyLibrary() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/resources/my-library${window.location.search}`);
  }, [router]);
  return <PageSkeleton />;
}

/**
 * Parents get the Resources journey (one child at a time: library, their library,
 * progress). Every other role goes to My Library.
 */
export default function ResourcesPage() {
  const { user } = useAuth();
  if (user && user.role !== 'USER') {
    return (
      <ResourcesShell>
        <ToMyLibrary />
      </ResourcesShell>
    );
  }
  return (
    <ResourcesShell>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={<PageSkeleton />}>
        <ResourceJourney />
      </Suspense>
    </ResourcesShell>
  );
}
