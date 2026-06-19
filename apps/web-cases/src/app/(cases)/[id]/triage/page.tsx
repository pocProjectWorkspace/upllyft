'use client';

import { use } from 'react';
import { TriageTab } from '@/components/tabs/triage-tab';

export default function TriagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TriageTab caseId={id} />;
}
