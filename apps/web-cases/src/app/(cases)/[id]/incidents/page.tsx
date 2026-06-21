'use client';

import { use } from 'react';
import { IncidentsTab } from '@/components/tabs/incidents-tab';

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <IncidentsTab caseId={id} />;
}
