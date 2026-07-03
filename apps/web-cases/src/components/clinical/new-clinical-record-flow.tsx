'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Badge } from '@upllyft/ui';
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import {
  THERAPY_DISCIPLINE_LABELS,
  CLINICAL_ACTIVITY_LABELS,
  type TherapyDiscipline,
  type ClinicalActivityType,
} from '@upllyft/types';
import {
  useTemplateCatalog,
  usePrefill,
  useTemplate,
  useCreateClinicalRecord,
} from '@/hooks/use-clinical';
import { buildInitialAnswers } from './prefill';
import type { CatalogEntry } from '@/lib/api/clinical';

interface Props {
  caseId: string;
  /** Optional deep-link pre-selection (e.g. from the MDT / Discharge tabs). */
  initialDiscipline?: TherapyDiscipline;
  initialActivity?: ClinicalActivityType;
}

/**
 * Two-step "start a clinical record" flow:
 *   1. pick the therapy discipline
 *   2. pick the template (digital equivalent of the paper form)
 * then create a DRAFT record (header pre-populated) and open it for capture.
 */
export function NewClinicalRecordFlow({ caseId, initialDiscipline, initialActivity }: Props) {
  const router = useRouter();
  const { data: catalog, isLoading } = useTemplateCatalog();
  const { data: prefill } = usePrefill(caseId);

  const [discipline, setDiscipline] = useState<TherapyDiscipline | null>(
    initialDiscipline ?? null,
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const { data: selectedTemplate } = useTemplate(templateId || undefined);
  const createMutation = useCreateClinicalRecord();

  const disciplines = useMemo(
    () => (catalog ?? []).filter((c) => c.activities.length > 0),
    [catalog],
  );

  // Deep-link pre-selection: once the catalog loads, auto-select the requested
  // discipline + template (e.g. arriving from the MDT / Discharge tabs).
  useEffect(() => {
    if (!catalog || (!initialDiscipline && !initialActivity)) return;
    const entry = catalog.find((c) => c.discipline === initialDiscipline);
    if (entry && !discipline) setDiscipline(entry.discipline);
    if (entry && initialActivity && !templateId) {
      const match = entry.activities.find((a) => a.activityType === initialActivity);
      if (match) {
        setTemplateId(match.id);
        setTitle(match.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);
  const activeEntry: CatalogEntry | undefined = useMemo(
    () => disciplines.find((d) => d.discipline === discipline),
    [disciplines, discipline],
  );

  const handleCreate = async () => {
    if (!templateId || !selectedTemplate) return;
    const answers = buildInitialAnswers(selectedTemplate.schema, prefill);
    const record = await createMutation.mutateAsync({
      caseId,
      data: {
        templateId,
        title: title.trim() || selectedTemplate.name,
        answers,
      },
    });
    router.push(`/${caseId}/assessments/${record.id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading templates…
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push(`/${caseId}/assessments`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Assessments
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">New clinical record</h1>
      <p className="text-gray-500 mb-6">
        Choose the therapy type, then the template you want to complete.
      </p>

      {/* Step 1 — discipline */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          1 · Therapy type
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {disciplines.map((d) => (
            <button
              key={d.discipline}
              onClick={() => {
                setDiscipline(d.discipline);
                setTemplateId(null);
              }}
              className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                discipline === d.discipline
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {THERAPY_DISCIPLINE_LABELS[d.discipline] ?? d.discipline}
                </span>
                {discipline === d.discipline && <Check className="h-4 w-4 text-teal-600" />}
              </div>
              <span className="text-xs text-gray-400">{d.activities.length} template(s)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — template */}
      {activeEntry && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            2 · Template
          </p>
          <div className="space-y-2">
            {activeEntry.activities.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setTemplateId(a.id);
                  setTitle(a.name);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  templateId === a.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{a.name}</span>
                  <Badge color="gray">
                    {CLINICAL_ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — title + create */}
      {templateId && (
        <Card className="p-5">
          <Label htmlFor="record-title">Record title</Label>
          <Input
            id="record-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5"
            placeholder="e.g. Initial Speech Assessment"
          />
          <p className="text-xs text-gray-400 mt-2">
            Client and case details will be pre-filled from the profile and intake form.
          </p>
          <div className="flex justify-end mt-4">
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-1" />
              )}
              Create & fill in
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
