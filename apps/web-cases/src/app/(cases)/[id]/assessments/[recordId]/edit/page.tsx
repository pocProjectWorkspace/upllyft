'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@upllyft/ui';
import { useClinicalRecord } from '@/hooks/use-clinical';
import { ClinicalRecordForm } from '@/components/clinical/clinical-record-form';
import type { ClinicalTemplateSchema } from '@upllyft/types';

export default function EditClinicalRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id: caseId, recordId } = use(params);
  const router = useRouter();
  const { data: record, isLoading } = useClinicalRecord(caseId, recordId);

  // Signed records are read-only — send to detail view.
  useEffect(() => {
    if (record && record.status === 'SIGNED') {
      router.replace(`/${caseId}/assessments/${recordId}`);
    }
  }, [record, caseId, recordId, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!record) {
    return <div className="text-center py-12 text-gray-500">Record not found</div>;
  }
  if (record.status === 'SIGNED') return null;

  const schema = record.template?.schema as ClinicalTemplateSchema | undefined;
  if (!schema) {
    return <div className="text-center py-12 text-gray-500">Template unavailable</div>;
  }

  return <ClinicalRecordForm caseId={caseId} record={record} schema={schema} />;
}
