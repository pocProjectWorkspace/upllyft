'use client';

import { use } from 'react';
import { useCase } from '@/hooks/use-cases';
import { OverviewTab } from '@/components/tabs/overview-tab';
import { Skeleton } from '@upllyft/ui';

export default function CaseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: caseData, isLoading } = useCase(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Case not found</p>
      </div>
    );
  }

  return <OverviewTab caseId={id} caseData={caseData} />;
}
