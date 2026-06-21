'use client';

import { use } from 'react';
import { IdentityTab } from '@/components/tabs/identity-tab';

export default function IdentityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <IdentityTab caseId={id} />;
}
