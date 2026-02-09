'use client';

import { use } from 'react';
import { AuditTab } from '@/components/tabs/audit-tab';

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AuditTab caseId={id} />;
}
