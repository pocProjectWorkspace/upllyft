'use client';

import { use } from 'react';
import { IEPsTab } from '@/components/tabs/ieps-tab';

export default function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <IEPsTab caseId={id} />;
}
