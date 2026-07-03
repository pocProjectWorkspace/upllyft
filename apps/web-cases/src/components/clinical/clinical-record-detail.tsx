'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Badge } from '@upllyft/ui';
import { ArrowLeft, Pencil, Lock, Sparkles, FileText, Loader2 } from 'lucide-react';
import type { ClinicalTemplateSchema, ClinicalField } from '@upllyft/types';
import {
  THERAPY_DISCIPLINE_LABELS,
  CLINICAL_ACTIVITY_LABELS,
} from '@upllyft/types';
import type { ClinicalRecord } from '@/lib/api/clinical';
import { useGenerateRecordReport } from '@/hooks/use-clinical';
import { formatDate } from '@/lib/utils';

interface Props {
  caseId: string;
  record: ClinicalRecord;
  schema: ClinicalTemplateSchema;
}

export function ClinicalRecordDetail({ caseId, record, schema }: Props) {
  const router = useRouter();
  const reportMutation = useGenerateRecordReport();
  const answers = record.answers ?? {};

  return (
    <div>
      <button
        onClick={() => router.push(`/${caseId}/assessments`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Assessments
      </button>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">
            {record.template?.name || record.templateCode}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{record.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
            <Badge color="gray">
              {THERAPY_DISCIPLINE_LABELS[record.discipline] ?? record.discipline}
            </Badge>
            <span>{CLINICAL_ACTIVITY_LABELS[record.activityType] ?? record.activityType}</span>
            <span>·</span>
            <span>{formatDate(record.createdAt)}</span>
            {record.status === 'SIGNED' ? (
              <Badge color="green">
                <Lock className="h-3 w-3 mr-1 inline" /> Signed
                {record.signedAt ? ` ${formatDate(record.signedAt)}` : ''}
              </Badge>
            ) : (
              <Badge color="yellow">Draft</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record.status !== 'SIGNED' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/${caseId}/assessments/${record.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() =>
              reportMutation.mutate({ caseId, recordId: record.id, data: {} })
            }
            disabled={reportMutation.isPending}
          >
            {reportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate report
          </Button>
          {record.reportDocumentId && (
            <Button variant="ghost" onClick={() => router.push(`/${caseId}/documents`)}>
              <FileText className="h-4 w-4 mr-1" /> Report
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {schema.sections?.map((section) => {
          const visible = section.fields.filter((f) => hasValue(answers[f.id]));
          if (!visible.length) return null;
          return (
            <Card key={section.id} className="p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{section.title}</h2>
              <dl className="space-y-3">
                {visible.map((field) => (
                  <div key={field.id}>
                    <dt className="text-xs font-medium text-gray-500">{field.label}</dt>
                    <dd className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">
                      {renderValue(field, answers[field.id])}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function hasValue(v: unknown): boolean {
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

function renderValue(field: ClinicalField, value: unknown): React.ReactNode {
  if (value == null) return '—';
  if (field.type === 'table' || field.type === 'smartgoal') {
    const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const cols = field.columns ?? [];
    return (
      <div className="overflow-x-auto border border-gray-100 rounded-lg mt-1">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="text-left px-2 py-1 font-medium text-gray-500">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                {cols.map((c) => (
                  <td key={c.key} className="px-2 py-1 text-gray-700">
                    {String(r[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (Array.isArray(value)) return value.join(', ');
  if (field.type === 'signature') {
    const v = value as { name?: string };
    return v?.name ?? '—';
  }
  if (field.type === 'daterange') {
    const v = value as { from?: string; to?: string };
    return [v?.from, v?.to].filter(Boolean).join(' → ') || '—';
  }
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
