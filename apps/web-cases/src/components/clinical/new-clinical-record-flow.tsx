'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Badge } from '@upllyft/ui';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft, ArrowRight, Loader2, Check,
  MessagesSquare, Hand, Activity, Brain, GraduationCap, PersonStanding,
  Stethoscope, Users, LayoutGrid,
  ClipboardList, NotebookPen, ClipboardCheck, Target, TrendingUp, LogOut, FileText,
} from 'lucide-react';
import {
  THERAPY_DISCIPLINE_LABELS,
  CLINICAL_ACTIVITY_LABELS,
  type TherapyDiscipline,
  type ClinicalActivityType,
} from '@upllyft/types';

const DISCIPLINE_ICON: Record<string, LucideIcon> = {
  SPEECH: MessagesSquare,
  OCCUPATIONAL: Hand,
  BEHAVIOUR_ABA: Activity,
  PSYCHOLOGY: Brain,
  SPECIAL_EDUCATION: GraduationCap,
  PHYSIOTHERAPY: PersonStanding,
  MEDICAL: Stethoscope,
  MULTIDISCIPLINARY: Users,
  UNIVERSAL: LayoutGrid,
};

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  INTAKE: ClipboardList,
  SESSION_NOTE: NotebookPen,
  ASSESSMENT: ClipboardCheck,
  CONSULTATION: Stethoscope,
  MDT_REVIEW: Users,
  GOAL_PLAN: Target,
  PROGRESS_REVIEW: TrendingUp,
  DISCHARGE: LogOut,
};

const ACTIVITY_COLOR: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  INTAKE: 'gray',
  SESSION_NOTE: 'blue',
  ASSESSMENT: 'purple',
  CONSULTATION: 'gray',
  MDT_REVIEW: 'purple',
  GOAL_PLAN: 'green',
  PROGRESS_REVIEW: 'yellow',
  DISCHARGE: 'red',
};
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
    <div className="max-w-4xl">
      <button
        onClick={() => router.push(`/${caseId}/assessments`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Assessments
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">New clinical record</h1>
      <p className="text-gray-500 mb-7">
        Choose the therapy type, then the template you want to complete.
      </p>

      {/* Step 1 — discipline */}
      <StepHeader n={1} label="Therapy type" />
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {disciplines.map((d) => {
          const Icon = DISCIPLINE_ICON[d.discipline] ?? LayoutGrid;
          const selected = discipline === d.discipline;
          return (
            <button
              key={d.discipline}
              onClick={() => { setDiscipline(d.discipline); setTemplateId(null); }}
              className={`group text-left rounded-2xl border p-4 flex items-center gap-3.5 transition-all ${
                selected
                  ? 'border-teal-500 bg-teal-50/60 ring-1 ring-teal-500/25 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
              }`}
            >
              <span
                className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                  selected
                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 leading-tight truncate">
                  {THERAPY_DISCIPLINE_LABELS[d.discipline] ?? d.discipline}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{d.activities.length} template(s)</p>
              </div>
              {selected && (
                <span className="h-5 w-5 shrink-0 rounded-full bg-teal-600 text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step 2 — template */}
      {activeEntry && (
        <div className="mb-8">
          <StepHeader n={2} label="Template" />
          <div className="space-y-2.5">
            {activeEntry.activities.map((a) => {
              const Icon = ACTIVITY_ICON[a.activityType] ?? FileText;
              const selected = templateId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => { setTemplateId(a.id); setTitle(a.name); }}
                  className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all ${
                    selected
                      ? 'border-teal-500 bg-teal-50/60 ring-1 ring-teal-500/25 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
                  }`}
                >
                  <span
                    className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                      selected ? 'bg-teal-100 text-teal-700' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 font-medium text-gray-800 truncate">{a.name}</span>
                  <Badge color={ACTIVITY_COLOR[a.activityType] ?? 'gray'}>
                    {CLINICAL_ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                  </Badge>
                  {selected && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — title + create */}
      {templateId && (
        <Card className="p-6 rounded-2xl border-gray-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
            <p className="text-sm font-semibold text-gray-800">Name &amp; create</p>
          </div>
          <Label htmlFor="record-title">Record title</Label>
          <Input
            id="record-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5"
            placeholder="e.g. Initial Speech Assessment"
          />
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-teal-500" />
            Client and case details will be pre-filled from the profile and intake form.
          </p>
          <div className="flex justify-end mt-5">
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-1.5" />
              )}
              Create &amp; fill in
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="h-6 w-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
        {n}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
}
