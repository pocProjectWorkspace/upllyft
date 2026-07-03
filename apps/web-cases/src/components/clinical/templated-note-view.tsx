'use client';

import { Card } from '@upllyft/ui';
import type { ClinicalField } from '@upllyft/types';
import { useTemplate } from '@/hooks/use-clinical';

interface Props {
  templateId?: string;
  answers?: Record<string, unknown>;
}

/** Read-only render of a template-driven session note (from structuredNotes). */
export function TemplatedNoteView({ templateId, answers = {} }: Props) {
  const { data: template } = useTemplate(templateId);
  if (!template) return null;

  return (
    <div className="space-y-4">
      {template.schema.sections?.map((section) => {
        const visible = section.fields.filter((f) => hasValue(answers[f.id]));
        if (!visible.length) return null;
        return (
          <Card key={section.id} className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{section.title}</h3>
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
            <tr>{cols.map((c) => <th key={c.key} className="text-left px-2 py-1 font-medium text-gray-500">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                {cols.map((c) => <td key={c.key} className="px-2 py-1 text-gray-700">{String(r[c.key] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (Array.isArray(value)) return value.join(', ');
  if (field.type === 'daterange') {
    const v = value as { from?: string; to?: string };
    return [v?.from, v?.to].filter(Boolean).join(' → ') || '—';
  }
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
