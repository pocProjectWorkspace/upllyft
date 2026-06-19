'use client';

import { use } from 'react';
import { PayerTab } from '@/components/tabs/payer-tab';

export default function PayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PayerTab caseId={id} />;
}
