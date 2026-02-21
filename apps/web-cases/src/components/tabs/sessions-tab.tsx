'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Badge,
  Button,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import {
  useSessions,
  useGenerateAiSummary,
} from '@/hooks/use-cases';
import {
  sessionAttendanceColors,
  sessionNoteStatusColors,
  sessionNoteStatusLabels,
  formatDate,
} from '@/lib/utils';
import {
  Plus,
  Loader2,
  FileText,
  Sparkles,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface SessionsTabProps {
  caseId: string;
}

export function SessionsTab({ caseId }: SessionsTabProps) {
  const router = useRouter();
  const { toast } = useToast();

  // ---- Queries ----
  const { data: sessionsData, isLoading } = useSessions(caseId);

  // Normalise — API may return paginated or plain array
  const sessions: any[] = Array.isArray(sessionsData)
    ? sessionsData
    : Array.isArray((sessionsData as any)?.data)
      ? (sessionsData as any).data
      : (sessionsData as any)?.sessions
        ? (sessionsData as any).sessions
        : Array.isArray((sessionsData as any)?.items)
          ? (sessionsData as any).items
          : [];

  // ---- Mutations ----
  const generateAiSummary = useGenerateAiSummary();

  // ---- Local state ----
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);

  const handleGenerateAI = (e: React.MouseEvent, sessionId: string, rawNotes?: string, structuredNotes?: Record<string, unknown>) => {
    e.stopPropagation();
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
        <Button
          variant="primary"
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => router.push(`/${caseId}/sessions/new`)}
        >
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
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
            const noteStatus =
              typeof session.noteStatus === 'string' ? session.noteStatus : 'DRAFT';
            const isSigned = noteStatus === 'SIGNED';
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
                : '';

            // Structured notes extraction for preview
            const structuredNotes =
              session.structuredNotes &&
              typeof session.structuredNotes === 'object'
                ? session.structuredNotes
                : null;
            const rawNotes =
              typeof session.rawNotes === 'string' ? session.rawNotes : '';

            // Assessment preview (first ~100 chars)
            const assessmentPreview =
              structuredNotes?.assessment ||
              structuredNotes?.response ||
              structuredNotes?.progressNotes ||
              '';
            const previewText =
              typeof assessmentPreview === 'string' && assessmentPreview.length > 0
                ? assessmentPreview.length > 100
                  ? assessmentPreview.slice(0, 100) + '...'
                  : assessmentPreview
                : '';

            return (
              <Card
                key={sessionId}
                className="p-4 cursor-pointer hover:border-teal-200 hover:shadow-sm transition-all"
                onClick={() => router.push(`/${caseId}/sessions/${sessionId}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {scheduledAt ? formatDate(scheduledAt) : 'No date'}
                        </span>
                        {noteFormat && (
                          <Badge color="blue">{noteFormat}</Badge>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                            sessionNoteStatusColors[noteStatus] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isSigned && <Lock className="h-3 w-3" />}
                          {sessionNoteStatusLabels[noteStatus] ?? noteStatus}
                        </span>
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
                        {therapistName &&
                          `${duration !== null ? ' \u00B7 ' : ''}${therapistName}`}
                        {typeof session.sessionType === 'string' &&
                          session.sessionType &&
                          ` \u00B7 ${session.sessionType}`}
                      </p>
                      {previewText && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                          {previewText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) =>
                        handleGenerateAI(e, sessionId, rawNotes, structuredNotes ?? undefined)
                      }
                      disabled={generatingAI === sessionId}
                    >
                      {generatingAI === sessionId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">AI Summary</span>
                    </Button>
                    <ExternalLink className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
