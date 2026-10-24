'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { LegalDocumentPage } from '@/components/legal/legal-document';

/** /legal/clinic-agreement, /legal/therapist-agreement (and /legal/terms, /legal/privacy). */
function Doc({ slug }: { slug: string }) {
  const version = useSearchParams().get('version') ?? undefined;
  return <LegalDocumentPage slug={slug} version={version} />;
}

export default function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={null}>
      <Doc slug={slug} />
    </Suspense>
  );
}
