'use client';

import { useRouter } from 'next/navigation';
import { Card, Badge, Button, Skeleton } from '@upllyft/ui';
import { Plus, ClipboardList, Lock, FileText } from 'lucide-react';
import {
  THERAPY_DISCIPLINE_LABELS,
  CLINICAL_ACTIVITY_LABELS,
} from '@upllyft/types';
import { useClinicalRecords } from '@/hooks/use-clinical';
import { formatDate } from '@/lib/utils';

interface AssessmentsTabProps {
  caseId: string;
}

export function AssessmentsTab({ caseId }: AssessmentsTabProps) {
  const router = useRouter();
  const { data, isLoading } = useClinicalRecords(caseId);
  const records = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments & Records</h1>
          <p className="text-gray-500 text-sm">
            Template-driven clinical records — assessments, reviews and notes.
          </p>
        </div>
        <Button onClick={() => router.push(`/${caseId}/assessments/new`)}>
          <Plus className="h-4 w-4 mr-1" /> New record
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No records yet</p>
          <p className="text-gray-400 text-sm mb-4">
            Start a clinical record from a template.
          </p>
          <Button onClick={() => router.push(`/${caseId}/assessments/new`)}>
            <Plus className="h-4 w-4 mr-1" /> New record
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <Card
              key={rec.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/${caseId}/assessments/${rec.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{rec.title}</p>
                    {rec.status === 'SIGNED' && (
                      <Badge color="green">
                        <Lock className="h-3 w-3 mr-1 inline" /> Signed
                      </Badge>
                    )}
                    {rec.status === 'DRAFT' && <Badge color="yellow">Draft</Badge>}
                    {rec.reportDocumentId && (
                      <Badge color="blue">
                        <FileText className="h-3 w-3 mr-1 inline" /> Report
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge color="gray">
                      {THERAPY_DISCIPLINE_LABELS[rec.discipline] ?? rec.discipline}
                    </Badge>
                    <span>·</span>
                    <span>{CLINICAL_ACTIVITY_LABELS[rec.activityType] ?? rec.activityType}</span>
                    <span>·</span>
                    <span>{formatDate(rec.createdAt)}</span>
                    {rec.therapist?.name && (
                      <>
                        <span>·</span>
                        <span>{rec.therapist.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
