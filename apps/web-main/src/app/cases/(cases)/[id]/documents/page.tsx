'use client';

import { use } from 'react';
import { DocumentsTab } from '@/cases/components/tabs/documents-tab';

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentsTab caseId={id} />;
}
