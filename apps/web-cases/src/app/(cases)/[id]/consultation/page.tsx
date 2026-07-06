'use client';

import { use } from 'react';
import { ConsultationTab } from '@/components/tabs/consultation-tab';

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ConsultationTab caseId={id} />;
}
