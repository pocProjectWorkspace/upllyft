'use client';

import { use, Suspense } from 'react';
import { EscalationTab } from '@/components/tabs/escalation-tab';

export default function EscalationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="h-64 rounded-2xl bg-gray-50 animate-pulse" />}>
      <EscalationTab caseId={id} />
    </Suspense>
  );
}
