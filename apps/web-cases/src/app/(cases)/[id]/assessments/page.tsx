'use client';

import { use } from 'react';
import { AssessmentsTab } from '@/components/tabs/assessments-tab';

export default function AssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AssessmentsTab caseId={id} />;
}
