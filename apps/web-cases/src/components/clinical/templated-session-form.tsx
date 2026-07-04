'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Card, Badge, Input, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@upllyft/ui';
import { ArrowLeft, Save, Lock, Loader2, CheckCircle2, Check } from 'lucide-react';
import {
  THERAPY_DISCIPLINE_LABELS,
  type TherapyDiscipline,
} from '@upllyft/types';
import { DynamicForm } from './dynamic-form';
import { buildInitialAnswers } from './prefill';
import {
  useTemplateCatalog,
  useTemplate,
  usePrefill,
} from '@/hooks/use-clinical';
import {
  useCreateSession,
  useUpdateSession,
  useSignSession,
} from '@/hooks/use-cases';
import type { CaseSession } from '@/lib/api/cases';

const ATTENDANCE = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const SESSION_TYPES = ['In-person', 'Teletherapy', 'Home Visit', 'Group', 'Parent coaching'];

interface Props {
  caseId: string;
  sessionId?: string;
  initialData?: CaseSession;
}

/** Session note captured via a discipline-specific template (stored in the
 *  session's structuredNotes JSON). Preserves the normal CaseSession lifecycle
 *  (sign/lock, goal progress, billing) — the note body is template-driven. */
export function TemplatedSessionForm({ caseId, sessionId, initialData }: Props) {
  const router = useRouter();
  const { data: prefill } = usePrefill(caseId);
  const { data: catalog } = useTemplateCatalog();

  const storedSN = (initialData?.structuredNotes ?? {}) as any;
  const [templateId, setTemplateId] = useState<string | undefined>(storedSN.templateId);
  const [discipline, setDiscipline] = useState<TherapyDiscipline | null>(null);
  const { data: template } = useTemplate(templateId);

  const [scheduledAt, setScheduledAt] = useState(
    (initialData?.scheduledAt ?? new Date().toISOString()).slice(0, 10),
  );
  const [duration, setDuration] = useState<number>(initialData?.actualDuration ?? 45);
  const [attendance, setAttendance] = useState<string>(initialData?.attendanceStatus ?? 'PRESENT');
  const [sessionType, setSessionType] = useState<string>(initialData?.sessionType ?? 'In-person');
  const [answers, setAnswers] = useState<Record<string, unknown>>(storedSN.answers ?? {});
  const [createdId, setCreatedId] = useState<string | undefined>(sessionId);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const isSigned = initialData?.noteStatus === 'SIGNED';
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const signSession = useSignSession();

  const seeded = useRef(false);
  useEffect(() => {
    if (template && !createdId && !seeded.current && !Object.keys(answers).length) {
      seeded.current = true;
      setAnswers(buildInitialAnswers(template.schema, prefill));
    }
  }, [template, prefill, createdId, answers]);

  // Session-note templates only, grouped by discipline.
  const disciplines = (catalog ?? [])
    .map((c) => ({
      discipline: c.discipline,
      activities: c.activities.filter((a) => a.activityType === 'SESSION_NOTE'),
    }))
    .filter((c) => c.activities.length > 0);

  const structuredNotes = useCallback(
    () => ({
      templateId,
      templateCode: template?.code,
      templateVersion: template?.version,
      answers,
    }),
    [templateId, template, answers],
  );
  const payload = useCallback(
    () => ({
      scheduledAt: new Date(scheduledAt).toISOString(),
      actualDuration: Number(duration),
      attendanceStatus: attendance as any,
      sessionType,
      noteFormat: 'CUSTOM' as const,
      structuredNotes: structuredNotes(),
    }),
    [scheduledAt, duration, attendance, sessionType, structuredNotes],
  );

  const setField = (id: string, v: unknown) => {
    setAnswers((p) => ({ ...p, [id]: v }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (!createdId || isSigned) return;
    await updateSession.mutateAsync({ caseId, sessionId: createdId, data: payload() });
    setDirty(false);
    setLastSaved(new Date());
  }, [createdId, isSigned, caseId, payload, updateSession]);

  useEffect(() => {
    if (isSigned || !createdId) return;
    const t = setInterval(() => dirty && save(), 30000);
    return () => clearInterval(t);
  }, [dirty, isSigned, createdId, save]);

  const handleCreate = async () => {
    const created = await createSession.mutateAsync({ caseId, data: payload() });
    const newId = (created as any).id;
    setCreatedId(newId);
    window.history.replaceState(null, '', `/${caseId}/sessions/${newId}/edit`);
  };

  const handleSign = async () => {
    if (dirty) await save();
    await signSession.mutateAsync({ caseId, sessionId: createdId! });
    setSignOpen(false);
    router.push(`/${caseId}/sessions/${createdId}`);
  };

  // ── Template picker (create mode, before a template is chosen) ──
  if (!templateId) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => router.push(`/${caseId}/sessions`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Sessions
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Template session note</h1>
        <p className="text-gray-500 mb-6">Choose the therapy type, then the session-note template.</p>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1 · Therapy type</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-6">
          {disciplines.map((d) => (
            <button
              key={d.discipline}
              onClick={() => setDiscipline(d.discipline)}
              className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                discipline === d.discipline ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium text-gray-800">
                {THERAPY_DISCIPLINE_LABELS[d.discipline] ?? d.discipline}
              </span>
            </button>
          ))}
        </div>

        {discipline && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2 · Template</p>
            <div className="space-y-2">
              {disciplines
                .find((d) => d.discipline === discipline)!
                .activities.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setTemplateId(a.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-teal-400 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800">{a.name}</span>
                    <Check className="h-4 w-4 text-gray-300" />
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Capture form ──
  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push(`/${caseId}/sessions`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Sessions
        </button>
        <div className="text-xs text-gray-400">
          {isSigned ? (
            <Badge color="green"><Lock className="h-3 w-3 mr-1 inline" /> Signed</Badge>
          ) : dirty ? (
            'Unsaved changes'
          ) : lastSaved ? (
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Saved</span>
          ) : null}
        </div>
      </div>

      <div className="mb-5">
        <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">
          {template?.name || 'Session note'}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Session note</h1>
      </div>

      {/* Session metadata */}
      <Card className="p-5 mb-5">
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={scheduledAt} disabled={isSigned}
              onChange={(e) => { setScheduledAt(e.target.value); setDirty(true); }} className="mt-1.5" />
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" value={duration} disabled={isSigned}
              onChange={(e) => { setDuration(Number(e.target.value)); setDirty(true); }} className="mt-1.5" />
          </div>
          <div>
            <Label>Attendance</Label>
            <Select value={attendance} onValueChange={(v) => { setAttendance(v); setDirty(true); }} disabled={isSigned}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTENDANCE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={sessionType} onValueChange={(v) => { setSessionType(v); setDirty(true); }} disabled={isSigned}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Template sections */}
      <DynamicForm
        sections={template?.schema.sections ?? []}
        answers={answers}
        onChange={setField}
        readOnly={isSigned}
      />

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2 z-10">
        {!createdId ? (
          <Button onClick={handleCreate} disabled={createSession.isPending}>
            {createSession.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Create note
          </Button>
        ) : !isSigned ? (
          <>
            <Button variant="outline" onClick={save} disabled={updateSession.isPending}>
              {updateSession.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save draft
            </Button>
            <Button onClick={() => setSignOpen(true)}><Lock className="h-4 w-4 mr-1" /> Sign & lock</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => router.push(`/${caseId}/sessions/${createdId}`)}>View note</Button>
        )}
      </div>

      <AlertDialog open={signOpen} onOpenChange={setSignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign & lock this session note?</AlertDialogTitle>
            <AlertDialogDescription>Signing finalizes and locks the note. It can no longer be edited.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign} disabled={signSession.isPending}>
              {signSession.isPending ? 'Signing…' : 'Sign & lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
