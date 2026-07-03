'use client';

import { use } from 'react';
import { Skeleton } from '@upllyft/ui';
import { useClinicalRecord } from '@/hooks/use-clinical';
import { ClinicalRecordDetail } from '@/components/clinical/clinical-record-detail';
import type { ClinicalTemplateSchema } from '@upllyft/types';

export default function ClinicalRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id: caseId, recordId } = use(params);
  const { data: record, isLoading } = useClinicalRecord(caseId, recordId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!record) {
    return <div className="text-center py-12 text-gray-500">Record not found</div>;
  }

  const schema = record.template?.schema as ClinicalTemplateSchema | undefined;
  if (!schema) {
    return <div className="text-center py-12 text-gray-500">Template unavailable</div>;
  }

  return <ClinicalRecordDetail caseId={caseId} record={record} schema={schema} />;
}
