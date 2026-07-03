'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { NewClinicalRecordFlow } from '@/components/clinical/new-clinical-record-flow';
import type { TherapyDiscipline, ClinicalActivityType } from '@upllyft/types';

export default function NewAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const discipline = search.get('discipline') as TherapyDiscipline | null;
  const activity = search.get('activity') as ClinicalActivityType | null;
  return (
    <NewClinicalRecordFlow
      caseId={id}
      initialDiscipline={discipline ?? undefined}
      initialActivity={activity ?? undefined}
    />
  );
}
