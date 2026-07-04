'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@upllyft/ui';
import {
  ArrowLeft,
  Save,
  Lock,
  Loader2,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { ClinicalTemplateSchema } from '@upllyft/types';
import { DynamicForm } from './dynamic-form';
import type { ClinicalRecord } from '@/lib/api/clinical';
import {
  useUpdateClinicalRecord,
  useSignClinicalRecord,
  useGenerateRecordReport,
} from '@/hooks/use-clinical';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@upllyft/ui';

interface ClinicalRecordFormProps {
  caseId: string;
  record: ClinicalRecord;
  schema: ClinicalTemplateSchema;
}

export function ClinicalRecordForm({ caseId, record, schema }: ClinicalRecordFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(record.answers ?? {});
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const isSigned = record.status === 'SIGNED';

  const updateMutation = useUpdateClinicalRecord();
  const signMutation = useSignClinicalRecord();
  const reportMutation = useGenerateRecordReport();

  const setField = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (isSigned) return;
    await updateMutation.mutateAsync({
      caseId,
      recordId: record.id,
      data: { answers: answersRef.current },
    });
    setDirty(false);
    setLastSaved(new Date());
  }, [caseId, record.id, isSigned, updateMutation]);

  // Autosave every 30s while there are unsaved changes.
  useEffect(() => {
    if (isSigned) return;
    const t = setInterval(() => {
      if (dirty) save();
    }, 30000);
    return () => clearInterval(t);
  }, [dirty, isSigned, save]);

  const handleSign = async () => {
    if (dirty) await save();
    await signMutation.mutateAsync({ caseId, recordId: record.id });
    setSignOpen(false);
    router.push(`/${caseId}/assessments/${record.id}`);
  };

  const handleGenerateReport = async () => {
    if (dirty) await save();
    await reportMutation.mutateAsync({ caseId, recordId: record.id, data: {} });
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push(`/${caseId}/assessments`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Assessments
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isSigned ? (
            <Badge color="green">
              <Lock className="h-3 w-3 mr-1 inline" /> Signed
            </Badge>
          ) : dirty ? (
            <span>Unsaved changes</span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Saved
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">
          {record.template?.name || record.templateCode}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{record.title}</h1>
      </div>

      {/* Sections */}
      <DynamicForm
        sections={schema.sections ?? []}
        answers={answers}
        onChange={setField}
        readOnly={isSigned}
      />

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2 z-10">
        {!isSigned && (
          <>
            <Button variant="outline" onClick={save} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save draft
            </Button>
            <Button onClick={() => setSignOpen(true)}>
              <Lock className="h-4 w-4 mr-1" /> Sign & lock
            </Button>
          </>
        )}
        <Button
          variant={isSigned ? 'primary' : 'secondary'}
          onClick={handleGenerateReport}
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
          <Button
            variant="ghost"
            onClick={() => router.push(`/${caseId}/documents`)}
          >
            <FileText className="h-4 w-4 mr-1" /> View report
          </Button>
        )}
      </div>

      <AlertDialog open={signOpen} onOpenChange={setSignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign & lock this record?</AlertDialogTitle>
            <AlertDialogDescription>
              Signing finalizes the record. It will be locked and can no longer be edited.
              You can still generate a report from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign} disabled={signMutation.isPending}>
              {signMutation.isPending ? 'Signing…' : 'Sign & lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
