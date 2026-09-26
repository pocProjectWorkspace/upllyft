'use client';

import { use } from 'react';
import { IntakeTab } from '@/cases/components/tabs/intake-tab';

export default function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <IntakeTab caseId={id} />;
}
