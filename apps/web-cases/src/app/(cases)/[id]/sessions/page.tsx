'use client';

import { use } from 'react';
import { SessionsTab } from '@/components/tabs/sessions-tab';

export default function SessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionsTab caseId={id} />;
}
