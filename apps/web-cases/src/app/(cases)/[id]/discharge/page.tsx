'use client';

import { use } from 'react';
import { DischargeTab } from '@/components/tabs/discharge-tab';

export default function DischargePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DischargeTab caseId={id} />;
}
