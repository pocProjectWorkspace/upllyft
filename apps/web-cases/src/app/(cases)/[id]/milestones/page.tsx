'use client';

import { use } from 'react';
import { MilestonesTab } from '@/components/tabs/milestones-tab';

export default function MilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MilestonesTab caseId={id} />;
}
