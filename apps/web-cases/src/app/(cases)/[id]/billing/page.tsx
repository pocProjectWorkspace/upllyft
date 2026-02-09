'use client';

import { use } from 'react';
import { BillingTab } from '@/components/tabs/billing-tab';

export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BillingTab caseId={id} />;
}
