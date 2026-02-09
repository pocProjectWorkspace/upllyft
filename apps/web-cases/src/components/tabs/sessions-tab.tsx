'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@upllyft/ui';
import {
  useSessions,
  useCreateSession,
  useGenerateAiSummary,
  useEnhanceClinicalNotes,
} from '@/hooks/use-cases';
import { sessionAttendanceColors, formatDate, formatDateTime } from '@/lib/utils';
import {
  Plus,
  Loader2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wand2,
  Calendar,
  Clock,
} from 'lucide-react';

interface SessionsTabProps {
  caseId: string;
}

const NOTE_FORMAT_OPTIONS = [
  { value: 'SOAP', label: 'SOAP' },
  { value: 'DAP', label: 'DAP' },
  { value: 'NARRATIVE', label: 'Narrative' },
];

const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'LATE', label: 'Late' },
];

export function SessionsTab({ caseId }: SessionsTabProps) {
  const { toast } = useToast();

  // ---- Queries ----
  const { data: sessionsData, isLoading } = useSessions(caseId);

  // Normalise — API may return paginated or plain array
  const sessions: any[] = Array.isArray(sessionsData)
    ? sessionsData
    : Array.isArray((sessionsData as any)?.data)
      ? (sessionsData as any).data
      : (sessionsData as any)?.sessions ?? [];

  // ---- Mutations ----
  const createSession = useCreateSession();
  const generateAiSummary = useGenerateAiSummary();
  const enhanceClinicalNotes = useEnhanceClinicalNotes();

  // ---- Local state ----
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [enhancingNotes, setEnhancingNotes] = useState<string | null>(null);
  const [enhancedResults, setEnhancedResults] = useState<Record<string, string>>(
    {},
  );

  const defaultSessionForm = {
    scheduledAt: new Date().toISOString().split('T')[0],
    duration: 60,
    noteFormat: 'SOAP',
    attendance: 'PRESENT',
    rawNotes: '',
    objectives: '',
    interventions: '',
    response: '',
    plan: '',
    sessionType: '',
    location: '',
  };
  const [newSession, setNewSession] = useState(defaultSessionForm);

  // ---- Handlers ----
  const handleCreate = () => {
    const structuredNotes: Record<string, string> = {};
    if (newSession.objectives) structuredNotes.objectives = newSession.objectives;
    if (newSession.interventions)
      structuredNotes.interventions = newSession.interventions;
    if (newSession.response) structuredNotes.response = newSession.response;
    if (newSession.plan) structuredNotes.plan = newSession.plan;

    createSession.mutate(
      {
        caseId,
        data: {
          scheduledAt: new Date(newSession.scheduledAt).toISOString(),
          sessionType: newSession.sessionType || undefined,
          location: newSession.location || undefined,
          actualDuration: Number(newSession.duration),
          attendanceStatus: newSession.attendance,
          noteFormat: newSession.noteFormat,
          rawNotes: newSession.rawNotes || undefined,
          structuredNotes:
            Object.keys(structuredNotes).length > 0
              ? structuredNotes
              : undefined,
        },
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewSession(defaultSessionForm);
        },
      },
    );
  };

  const handleGenerateAI = (sessionId: string, rawNotes?: string, structuredNotes?: Record<string, unknown>) => {
    setGeneratingAI(sessionId);
    generateAiSummary.mutate(
      {
        caseId,
        sessionId,
        data: {
          rawNotes: rawNotes || undefined,
          structuredNotes: structuredNotes || undefined,
        },
      },
      {
        onSettled: () => setGeneratingAI(null),
      },
    );
  };

  const handleEnhanceNotes = (sessionId: string, text: string) => {
    setEnhancingNotes(sessionId);
    enhanceClinicalNotes.mutate(
      { caseId, sessionId, data: { text } },
      {
        onSuccess: (result: any) => {
          const enhancedText =
            typeof result?.enhancedText === 'string'
              ? result.enhancedText
              : typeof result === 'string'
                ? result
                : '';
          if (enhancedText) {
            setEnhancedResults((prev) => ({
              ...prev,
              [sessionId]: enhancedText,
            }));
            toast({ title: 'Notes enhanced successfully' });
          }
        },
        onSettled: () => setEnhancingNotes(null),
      },
    );
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          Session Notes ({sessions.length})
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="primary" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" /> New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Session Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Top row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newSession.scheduledAt}
                    onChange={(e) =>
                      setNewSession({ ...newSession, scheduledAt: e.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={newSession.duration}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        duration: Number(e.target.value),
                      })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Format</Label>
                  <Select
                    value={newSession.noteFormat}
                    onValueChange={(v) =>
                      setNewSession({ ...newSession, noteFormat: v })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Attendance</Label>
                  <Select
                    value={newSession.attendance}
                    onValueChange={(v) =>
                      setNewSession({ ...newSession, attendance: v })
                    }
                  >
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

              {/* Session type + location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Session Type</Label>
                  <Input
                    value={newSession.sessionType}
                    onChange={(e) =>
                      setNewSession({ ...newSession, sessionType: e.target.value })
                    }
                    placeholder="e.g., Individual, Group"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newSession.location}
                    onChange={(e) =>
                      setNewSession({ ...newSession, location: e.target.value })
                    }
                    placeholder="e.g., Office, Telehealth"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Notes fields */}
              <div>
                <Label>Raw Notes</Label>
                <Textarea
                  value={newSession.rawNotes}
                  onChange={(e) =>
                    setNewSession({ ...newSession, rawNotes: e.target.value })
                  }
                  placeholder="Quick notes from the session..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Objectives</Label>
                <Textarea
                  value={newSession.objectives}
                  onChange={(e) =>
                    setNewSession({ ...newSession, objectives: e.target.value })
                  }
                  placeholder="Session objectives..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Interventions</Label>
                <Textarea
                  value={newSession.interventions}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      interventions: e.target.value,
                    })
                  }
                  placeholder="Interventions used..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Client Response</Label>
                <Textarea
                  value={newSession.response}
                  onChange={(e) =>
                    setNewSession({ ...newSession, response: e.target.value })
                  }
                  placeholder="How the client responded..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Plan</Label>
                <Textarea
                  value={newSession.plan}
                  onChange={(e) =>
                    setNewSession({ ...newSession, plan: e.target.value })
                  }
                  placeholder="Plan for next session..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  disabled={createSession.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {createSession.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Session
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No sessions recorded yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create your first session note to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const sessionId =
              typeof session.id === 'string' ? session.id : String(session.id);
            const isExpanded = expandedSession === sessionId;

            // Safely read fields
            const scheduledAt =
              typeof session.scheduledAt === 'string'
                ? session.scheduledAt
                : typeof session.sessionDate === 'string'
                  ? session.sessionDate
                  : '';
            const noteFormat =
              typeof session.noteFormat === 'string' ? session.noteFormat : '';
            const attendance =
              typeof session.attendanceStatus === 'string'
                ? session.attendanceStatus
                : typeof session.attendance === 'string'
                  ? session.attendance
                  : '';
            const duration =
              typeof session.actualDuration === 'number'
                ? session.actualDuration
                : typeof session.duration === 'number'
                  ? session.duration
                  : null;
            const therapistName =
              session.therapist &&
              typeof session.therapist === 'object' &&
              typeof session.therapist.name === 'string'
                ? session.therapist.name
                : session.therapist?.user &&
                    typeof session.therapist.user === 'object' &&
                    typeof session.therapist.user.name === 'string'
                  ? session.therapist.user.name
                  : '';

            // Structured notes extraction
            const structuredNotes =
              session.structuredNotes &&
              typeof session.structuredNotes === 'object'
                ? session.structuredNotes
                : null;
            const objectives =
              typeof session.objectives === 'string'
                ? session.objectives
                : structuredNotes && typeof structuredNotes.objectives === 'string'
                  ? structuredNotes.objectives
                  : '';
            const interventions =
              typeof session.interventions === 'string'
                ? session.interventions
                : structuredNotes &&
                    typeof structuredNotes.interventions === 'string'
                  ? structuredNotes.interventions
                  : '';
            const response =
              typeof session.response === 'string'
                ? session.response
                : structuredNotes && typeof structuredNotes.response === 'string'
                  ? structuredNotes.response
                  : '';
            const plan =
              typeof session.plan === 'string'
                ? session.plan
                : structuredNotes && typeof structuredNotes.plan === 'string'
                  ? structuredNotes.plan
                  : '';
            const rawNotes =
              typeof session.rawNotes === 'string' ? session.rawNotes : '';
            const aiSummary =
              typeof session.aiSummary === 'string' ? session.aiSummary : '';
            const enhancedNotes =
              typeof session.enhancedNotes === 'string'
                ? session.enhancedNotes
                : enhancedResults[sessionId] || '';
            const goalProgress = Array.isArray(session.goalProgress)
              ? session.goalProgress
              : [];

            return (
              <Card key={sessionId} className="p-4">
                {/* Collapsed header row */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedSession(isExpanded ? null : sessionId)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {scheduledAt
                            ? formatDate(scheduledAt)
                            : 'No date'}
                        </span>
                        {noteFormat && (
                          <Badge color="blue">{noteFormat}</Badge>
                        )}
                        {attendance && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              sessionAttendanceColors[attendance] ??
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {attendance}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {duration !== null && `${duration} min`}
                        {therapistName && `${duration !== null ? ' \u00B7 ' : ''}${therapistName}`}
                        {typeof session.sessionType === 'string' &&
                          session.sessionType &&
                          ` \u00B7 ${session.sessionType}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAI(sessionId, rawNotes, structuredNotes ?? undefined);
                      }}
                      disabled={generatingAI === sessionId}
                    >
                      {generatingAI === sessionId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">AI Summary</span>
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {objectives && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Objectives
                        </p>
                        <p className="text-sm mt-1">{objectives}</p>
                      </div>
                    )}
                    {interventions && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Interventions
                        </p>
                        <p className="text-sm mt-1">{interventions}</p>
                      </div>
                    )}
                    {response && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Response
                        </p>
                        <p className="text-sm mt-1">{response}</p>
                      </div>
                    )}
                    {plan && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Plan
                        </p>
                        <p className="text-sm mt-1">{plan}</p>
                      </div>
                    )}
                    {rawNotes && (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Raw Notes
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnhanceNotes(sessionId, rawNotes);
                            }}
                            disabled={enhancingNotes === sessionId}
                            className="h-7 text-xs"
                          >
                            {enhancingNotes === sessionId ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Wand2 className="h-3 w-3 mr-1" />
                            )}
                            Enhance Language
                          </Button>
                        </div>
                        <p className="text-sm mt-1">{rawNotes}</p>
                      </div>
                    )}
                    {enhancedNotes && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-700 uppercase">
                          Enhanced Clinical Notes
                        </p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {enhancedNotes}
                        </p>
                      </div>
                    )}
                    {aiSummary && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-purple-700 uppercase">
                          AI Summary
                        </p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {aiSummary}
                        </p>
                      </div>
                    )}
                    {goalProgress.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          Goal Progress
                        </p>
                        <div className="space-y-2">
                          {goalProgress.map((gp: any) => {
                            const goalText =
                              gp.goal && typeof gp.goal === 'object' && typeof gp.goal.goalText === 'string'
                                ? gp.goal.goalText
                                : gp.goal && typeof gp.goal === 'object' && typeof gp.goal.description === 'string'
                                  ? gp.goal.description
                                  : typeof gp.goalId === 'string'
                                    ? gp.goalId
                                    : 'Goal';
                            const progressVal =
                              typeof gp.progressValue === 'number'
                                ? gp.progressValue
                                : null;

                            return (
                              <div
                                key={gp.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="flex-1 mr-3">{goalText}</span>
                                {progressVal !== null && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-teal-500 h-2 rounded-full"
                                        style={{
                                          width: `${Math.min(100, Math.max(0, progressVal))}%`,
                                        }}
                                      />
                                    </div>
                                    <Badge color="gray">{progressVal}%</Badge>
                                  </div>
                                )}
                                {typeof gp.progressNote === 'string' &&
                                  gp.progressNote && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {gp.progressNote}
                                    </p>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
