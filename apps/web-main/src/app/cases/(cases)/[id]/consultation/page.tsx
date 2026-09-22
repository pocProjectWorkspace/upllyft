'use client';

import { use } from 'react';
import { ConsultationTab } from '@/cases/components/tabs/consultation-tab';

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ConsultationTab caseId={id} />;
}
