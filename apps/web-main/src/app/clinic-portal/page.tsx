'use client';

import { Suspense } from 'react';
import { PageSkeleton } from '@upllyft/ui';
import { PortalShell } from '@/clinic-portal/components/portal-shell';
import { ClinicPortal } from '@/clinic-portal/components/clinic-portal';

export default function ClinicPortalPage() {
  return (
    <PortalShell>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={<PageSkeleton />}>
        <ClinicPortal />
      </Suspense>
    </PortalShell>
  );
}
