'use client';

import { use } from 'react';
import { WorksheetsTab } from '@/components/tabs/worksheets-tab';

export default function WorksheetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorksheetsTab caseId={id} />;
}
