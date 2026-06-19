'use client';

import { use } from 'react';
import { MdtTab } from '@/components/tabs/mdt-tab';

export default function MdtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MdtTab caseId={id} />;
}
