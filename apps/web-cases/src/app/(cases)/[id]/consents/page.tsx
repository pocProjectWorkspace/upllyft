'use client';

import { use } from 'react';
import { ConsentsTab } from '@/components/tabs/consents-tab';

export default function ConsentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ConsentsTab caseId={id} />;
}
