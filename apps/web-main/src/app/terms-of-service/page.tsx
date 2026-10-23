'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LegalDocumentPage } from '@/components/legal/legal-document';
import { TERMS_OF_SERVICE } from '@/lib/legal-content';

// The text is managed and versioned at /admin/legal. ?version= shows a past version.
function Terms() {
  const version = useSearchParams().get('version') ?? undefined;
  return <LegalDocumentPage slug="terms" version={version} fallback={TERMS_OF_SERVICE} />;
}

export default function TermsOfServicePage() {
  return (
    <Suspense fallback={null}>
      <Terms />
    </Suspense>
  );
}
