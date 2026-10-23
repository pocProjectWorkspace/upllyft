'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LegalDocumentPage } from '@/components/legal/legal-document';

// The text is managed and versioned at /admin/legal. ?version= shows a past version.
function Privacy() {
  const version = useSearchParams().get('version') ?? undefined;
  return <LegalDocumentPage slug="privacy" version={version} />;
}

export default function PrivacyPolicyPage() {
  return (
    <Suspense fallback={null}>
      <Privacy />
    </Suspense>
  );
}
