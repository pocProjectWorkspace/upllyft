'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LegalDocumentPage } from '@/components/legal/legal-document';

// The text is managed and versioned at /admin/legal. ?version= shows a past version.
function Terms() {
  const version = useSearchParams().get('version') ?? undefined;
  return <LegalDocumentPage slug="terms" version={version} />;
}

export default function TermsOfServicePage() {
  return (
    <Suspense fallback={null}>
      <Terms />
    </Suspense>
  );
}
