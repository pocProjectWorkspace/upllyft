'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-cases';
import {
  Card,
  Badge,
  Button,
  Skeleton,
} from '@upllyft/ui';
import {
  ArrowLeft,
  FileText,
  Pencil,
  Clock,
  Calendar,
  MapPin,
  User,
  Lock,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  sessionNoteStatusColors,
  sessionNoteStatusLabels,
  sessionAttendanceColors,
  goalProgressRatingLabels,
} from '@/lib/utils';

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: caseId, sessionId } = use(params);
  const router = useRouter();
  const { data: session, isLoading } = useSession(caseId, sessionId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session not found</p>
      </div>
    );
  }

  const sn = (session.structuredNotes ?? {}) as Record<string, string>;
  const noteStatus = session.noteStatus ?? 'DRAFT';
  const isSigned = noteStatus === 'SIGNED';
  const goalProgress = session.goalProgress ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/${caseId}/sessions`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Session Note</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                sessionNoteStatusColors[noteStatus] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {isSigned && <Lock className="h-3 w-3 inline mr-1" />}
              {sessionNoteStatusLabels[noteStatus] ?? noteStatus}
            </span>
          </div>
          {isSigned && session.signedAt && (
            <p className="text-sm text-gray-500 mt-0.5">
              Signed on {formatDateTime(session.signedAt)}
            </p>
          )}
        </div>

        {!isSigned && (
          <Button
            variant="outline"
            onClick={() => router.push(`/${caseId}/sessions/${sessionId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Session Details Card */}
      <Card className="p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {formatDate(session.scheduledAt)}
          </div>
          {session.actualDuration && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              {session.actualDuration} min
            </div>
          )}
          {session.sessionType && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              {session.sessionType}
            </div>
          )}
          {session.therapist?.name && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              {session.therapist.name}
            </div>
          )}
          {session.attendanceStatus && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                sessionAttendanceColors[session.attendanceStatus] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {session.attendanceStatus}
            </span>
          )}
        </div>
      </Card>

      {/* SOAP Sections */}
      <div className="space-y-4">
        {sn.subjective && (
          <SoapReadSection letter="S" title="Subjective" content={sn.subjective} />
        )}
        {sn.objective && (
          <SoapReadSection letter="O" title="Objective" content={sn.objective} />
        )}
        {(sn.assessment || goalProgress.length > 0) && (
          <Card className="p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold bg-amber-100 text-amber-700">
                A
              </span>
              <h3 className="font-medium text-gray-900">Assessment</h3>
            </div>
            {sn.assessment && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{sn.assessment}</p>
            )}
            {goalProgress.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Goal Progress</p>
                <div className="space-y-2">
                  {goalProgress.map((gp: any) => {
                    const goalText = gp.goal?.goalText ?? 'Goal';
                    const rating = gp.progressNote ?? '';
                    const ratingLabel = goalProgressRatingLabels[rating] ?? rating;
                    const progressVal = typeof gp.progressValue === 'number' ? gp.progressValue : null;

                    return (
                      <div key={gp.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg p-3">
                        <div className="flex-1 mr-3">
                          <p className="font-medium text-gray-800">{goalText}</p>
                          <p className="text-xs text-gray-500">{gp.goal?.domain}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ratingLabel && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                rating === 'REGRESSION'
                                  ? 'bg-red-100 text-red-700'
                                  : rating === 'MAINTAINING'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : rating === 'PROGRESSING'
                                      ? 'bg-blue-100 text-blue-700'
                                      : rating === 'ACHIEVED'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {ratingLabel}
                            </span>
                          )}
                          {progressVal !== null && (
                            <Badge color="gray">{progressVal}%</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}
        {sn.plan && <SoapReadSection letter="P" title="Plan" content={sn.plan} />}

        {/* Legacy fields fallback */}
        {sn.objectives && !sn.subjective && (
          <SoapReadSection letter="S" title="Subjective" content={sn.objectives} />
        )}
        {sn.interventions && !sn.objective && (
          <SoapReadSection letter="O" title="Objective" content={sn.interventions} />
        )}
        {sn.response && !sn.assessment && (
          <SoapReadSection letter="A" title="Assessment" content={sn.response} />
        )}
      </div>

      {/* Raw Notes */}
      {session.rawNotes && (
        <Card className="p-5 border border-gray-100 mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Raw Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.rawNotes}</p>
        </Card>
      )}

      {/* AI Summary */}
      {session.aiSummary && (
        <Card className="p-5 border border-purple-100 bg-purple-50/50 mt-4">
          <p className="text-xs font-medium text-purple-700 uppercase mb-2">AI Summary</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.aiSummary}</p>
        </Card>
      )}
    </div>
  );
}

function SoapReadSection({
  letter,
  title,
  content,
}: {
  letter: string;
  title: string;
  content: string;
}) {
  const colors: Record<string, string> = {
    S: 'bg-blue-100 text-blue-700',
    O: 'bg-emerald-100 text-emerald-700',
    A: 'bg-amber-100 text-amber-700',
    P: 'bg-purple-100 text-purple-700',
  };

  return (
    <Card className="p-5 border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold ${colors[letter] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {letter}
        </span>
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
    </Card>
  );
}
