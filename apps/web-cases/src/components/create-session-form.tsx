'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCreateSession,
  useUpdateSession,
  useSignSession,
  useBulkLogGoalProgress,
  useMiraScribe,
} from '@/hooks/use-cases';
import {
  Button,
  Card,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  Badge,
} from '@upllyft/ui';
import { ArrowLeft, Loader2, FileText, Save, Lock, CheckCircle2, AlertCircle, Sparkles, X, Info } from 'lucide-react';
import { SOAPSection } from './soap-section';
import { GoalProgressLinker, type GoalProgressEntry } from './goal-progress-linker';
import type { CaseSession } from '@/lib/api/cases';

const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'LATE', label: 'Late' },
];

const SESSION_TYPE_OPTIONS = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Teletherapy', label: 'Teletherapy' },
  { value: 'Home Visit', label: 'Home Visit' },
];

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface SessionNoteFormProps {
  caseId: string;
  sessionId?: string;
  initialData?: CaseSession;
}

export function CreateSessionForm({ caseId }: { caseId: string }) {
  return <SessionNoteForm caseId={caseId} />;
}

export function SessionNoteForm({ caseId, sessionId, initialData }: SessionNoteFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const signSession = useSignSession();
  const bulkLogGoalProgress = useBulkLogGoalProgress();
  const miraScribe = useMiraScribe();

  const isEditMode = !!sessionId;

  // Session header fields
  const [scheduledAt, setScheduledAt] = useState(
    initialData?.scheduledAt
      ? new Date(initialData.scheduledAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [duration, setDuration] = useState(initialData?.actualDuration ?? 60);
  const [attendance, setAttendance] = useState(initialData?.attendanceStatus ?? 'PRESENT');
  const [sessionType, setSessionType] = useState(initialData?.sessionType ?? '');

  // SOAP fields
  const sn = (initialData?.structuredNotes ?? {}) as Record<string, string>;
  const [subjective, setSubjective] = useState(sn.subjective ?? sn.objectives ?? '');
  const [objective, setObjective] = useState(sn.objective ?? sn.interventions ?? '');
  const [assessment, setAssessment] = useState(sn.assessment ?? sn.response ?? '');
  const [plan, setPlan] = useState(sn.plan ?? '');
  const [rawNotes, setRawNotes] = useState(initialData?.rawNotes ?? '');

  // Goal progress
  const [goalEntries, setGoalEntries] = useState<GoalProgressEntry[]>(() => {
    if (initialData?.goalProgress) {
      return initialData.goalProgress.map((gp) => ({
        goalId: gp.goalId,
        progressNote: gp.progressNote ?? 'MAINTAINING',
        progressValue: gp.progressValue ?? 25,
      }));
    }
    return [];
  });

  // Auto-save state
  const [createdSessionId, setCreatedSessionId] = useState<string | undefined>(sessionId);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Mira Scribe state
  const [showScribeConfirm, setShowScribeConfirm] = useState(false);
  const [showAiDraftBanner, setShowAiDraftBanner] = useState(false);
  const isScribing = miraScribe.isPending;

  const hasExistingSoapContent = !!(subjective || objective || assessment || plan);

  const handleScribeClick = () => {
    if (!createdSessionId) {
      toast({ title: 'Save the session first before using Mira', variant: 'destructive' });
      return;
    }
    if (hasExistingSoapContent) {
      setShowScribeConfirm(true);
    } else {
      runScribe();
    }
  };

  const runScribe = () => {
    if (!createdSessionId) return;
    setShowScribeConfirm(false);
    miraScribe.mutate(
      { sessionId: createdSessionId },
      {
        onSuccess: (data) => {
          setSubjective(data.soapSubjective);
          setObjective(data.soapObjective);
          setAssessment(data.soapAssessment);
          setPlan(data.soapPlan);
          setShowAiDraftBanner(true);
          hasUnsavedChanges.current = true;
          setAutoSaveStatus('unsaved');
          // Scroll to the top of the SOAP sections
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
    );
  };

  const buildStructuredNotes = useCallback(() => {
    const notes: Record<string, string> = {};
    if (subjective) notes.subjective = subjective;
    if (objective) notes.objective = objective;
    if (assessment) notes.assessment = assessment;
    if (plan) notes.plan = plan;
    return Object.keys(notes).length > 0 ? notes : undefined;
  }, [subjective, objective, assessment, plan]);

  const buildPayload = useCallback(() => ({
    actualDuration: Number(duration),
    attendanceStatus: attendance,
    noteFormat: 'SOAP' as const,
    sessionType: sessionType || undefined,
    rawNotes: rawNotes || undefined,
    structuredNotes: buildStructuredNotes(),
  }), [duration, attendance, sessionType, rawNotes, buildStructuredNotes]);

  // Mark unsaved on any field change
  useEffect(() => {
    if (createdSessionId) {
      hasUnsavedChanges.current = true;
      setAutoSaveStatus('unsaved');
    }
  }, [subjective, objective, assessment, plan, rawNotes, duration, attendance, sessionType, createdSessionId]);

  // Auto-save interval (30s) - only after first save
  useEffect(() => {
    if (!createdSessionId) return;

    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges.current) {
        performAutoSave();
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [createdSessionId]);

  const performAutoSave = useCallback(() => {
    if (!createdSessionId) return;
    setAutoSaveStatus('saving');
    hasUnsavedChanges.current = false;

    updateSession.mutate(
      { caseId, sessionId: createdSessionId, data: buildPayload() },
      {
        onSuccess: () => setAutoSaveStatus('saved'),
        onError: () => {
          setAutoSaveStatus('unsaved');
          hasUnsavedChanges.current = true;
        },
      },
    );
  }, [createdSessionId, caseId, buildPayload, updateSession]);

  const handleSaveDraft = async () => {
    if (createdSessionId) {
      // Update existing
      setAutoSaveStatus('saving');
      hasUnsavedChanges.current = false;
      updateSession.mutate(
        { caseId, sessionId: createdSessionId, data: buildPayload() },
        {
          onSuccess: () => {
            setAutoSaveStatus('saved');
            // Also save goal progress
            if (goalEntries.length > 0) {
              bulkLogGoalProgress.mutate({
                caseId,
                sessionId: createdSessionId,
                data: { entries: goalEntries },
              });
            }
          },
          onError: () => {
            setAutoSaveStatus('unsaved');
            hasUnsavedChanges.current = true;
          },
        },
      );
    } else {
      // Create new session
      createSession.mutate(
        {
          caseId,
          data: {
            scheduledAt: new Date(scheduledAt).toISOString(),
            ...buildPayload(),
          },
        },
        {
          onSuccess: (result: any) => {
            const newId = result?.id;
            if (newId) {
              setCreatedSessionId(newId);
              setAutoSaveStatus('saved');
              hasUnsavedChanges.current = false;
              // Save goal progress
              if (goalEntries.length > 0) {
                bulkLogGoalProgress.mutate({
                  caseId,
                  sessionId: newId,
                  data: { entries: goalEntries },
                });
              }
              // Update URL to edit mode without full navigation
              window.history.replaceState(null, '', `/${caseId}/sessions/${newId}/edit`);
            }
          },
        },
      );
    }
  };

  const handleSign = () => {
    if (!createdSessionId) {
      toast({ title: 'Save the session first before signing', variant: 'destructive' });
      return;
    }
    setShowSignConfirm(true);
  };

  const confirmSign = () => {
    if (!createdSessionId) return;
    setShowSignConfirm(false);

    // Save any pending changes first, then sign
    const doSign = () => {
      signSession.mutate(
        { caseId, sessionId: createdSessionId },
        {
          onSuccess: () => {
            router.push(`/${caseId}/sessions/${createdSessionId}`);
          },
        },
      );
    };

    if (hasUnsavedChanges.current) {
      updateSession.mutate(
        { caseId, sessionId: createdSessionId, data: buildPayload() },
        {
          onSuccess: () => {
            if (goalEntries.length > 0) {
              bulkLogGoalProgress.mutate(
                { caseId, sessionId: createdSessionId, data: { entries: goalEntries } },
                { onSuccess: doSign },
              );
            } else {
              doSign();
            }
          },
        },
      );
    } else {
      if (goalEntries.length > 0) {
        bulkLogGoalProgress.mutate(
          { caseId, sessionId: createdSessionId, data: { entries: goalEntries } },
          { onSuccess: doSign },
        );
      } else {
        doSign();
      }
    }
  };

  const isSaving = createSession.isPending || updateSession.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/${caseId}/sessions`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Session Note' : 'New Session Note'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Document a clinical session with SOAP-formatted notes
          </p>
        </div>

        {/* Auto-save indicator */}
        {createdSessionId && (
          <div className="flex items-center gap-1.5 text-sm">
            {autoSaveStatus === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                <span className="text-gray-400">Saving...</span>
              </>
            )}
            {autoSaveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600">Saved</span>
              </>
            )}
            {autoSaveStatus === 'unsaved' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600">Unsaved changes</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Session Header */}
        <Card className="p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Session Details</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="scheduledAt">Date *</Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1.5"
                  disabled={isEditMode}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1.5"
                  min={1}
                />
              </div>
              <div>
                <Label>Session Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Attendance</Label>
                <Select value={attendance} onValueChange={setAttendance}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTENDANCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* AI Draft Banner */}
        {showAiDraftBanner && (
          <div className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-teal-800 font-medium">
                Mira has drafted this note. Review carefully and edit before signing.
              </p>
            </div>
            <button
              onClick={() => setShowAiDraftBanner(false)}
              className="text-teal-500 hover:text-teal-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* SOAP Sections */}
        <div className="space-y-3">
          <SOAPSection letter="S" title="Subjective">
            <Textarea
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="Client/caregiver report: presenting concerns, symptoms reported by patient or family, relevant history updates, pain levels, mood descriptions..."
              rows={4}
              disabled={isScribing}
            />
          </SOAPSection>

          <SOAPSection letter="O" title="Objective">
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Clinician observations: measurable data, test results, behavioral observations, vital signs, standardized assessment scores, activities performed..."
              rows={4}
              disabled={isScribing}
            />
          </SOAPSection>

          <SOAPSection letter="A" title="Assessment">
            <div className="space-y-4">
              <Textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Clinical interpretation: progress analysis, comparison to baseline, clinical reasoning, diagnosis updates, barriers to progress..."
                rows={4}
                disabled={isScribing}
              />
              <GoalProgressLinker
                caseId={caseId}
                value={goalEntries}
                onChange={setGoalEntries}
                disabled={isScribing}
              />
            </div>
          </SOAPSection>

          <SOAPSection letter="P" title="Plan">
            <Textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Next steps: treatment modifications, homework/home program, referrals, next session objectives, caregiver recommendations..."
              rows={4}
              disabled={isScribing}
            />
          </SOAPSection>
        </div>

        {/* Raw Notes (optional) */}
        <Card className="p-6 border border-gray-100">
          <Label htmlFor="rawNotes" className="text-sm font-medium text-gray-700">
            Additional Raw Notes (optional)
          </Label>
          <Textarea
            id="rawNotes"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Quick unstructured notes — you can enhance these with AI later"
            rows={3}
            className="mt-1.5"
          />
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.push(`/${caseId}/sessions`)}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {(!initialData?.noteStatus || initialData.noteStatus === 'DRAFT') && (
              <Button
                type="button"
                variant="outline"
                onClick={handleScribeClick}
                disabled={isSaving || isScribing || signSession.isPending}
              >
                {isScribing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isScribing ? 'Mira is drafting...' : 'Draft with Mira'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || isScribing}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleSign}
              disabled={isSaving || signSession.isPending || isScribing}
            >
              {signSession.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Sign &amp; Lock
            </Button>
          </div>
        </div>
      </div>

      {/* Sign Confirmation Dialog */}
      {showSignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sign Session Note?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Signing this session note will lock it from further edits. This is equivalent to a
              clinical signature and creates a permanent record. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSignConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={confirmSign}
                disabled={signSession.isPending}
              >
                {signSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yes, Sign &amp; Lock
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Scribe Overwrite Confirmation Dialog */}
      {showScribeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Replace existing draft?</h3>
                <p className="text-sm text-gray-500">Mira will overwrite your current notes</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Mira will replace your existing draft. Continue?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowScribeConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={runScribe}
              >
                Yes, Continue
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
