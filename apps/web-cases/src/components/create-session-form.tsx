'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateSession } from '@/hooks/use-cases';
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
} from '@upllyft/ui';
import { ArrowLeft, Loader2, FileText, Stethoscope } from 'lucide-react';

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

interface CreateSessionFormProps {
  caseId: string;
}

export function CreateSessionForm({ caseId }: CreateSessionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const createSession = useCreateSession();

  const [scheduledAt, setScheduledAt] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [duration, setDuration] = useState(60);
  const [noteFormat, setNoteFormat] = useState('SOAP');
  const [attendance, setAttendance] = useState('PRESENT');
  const [sessionType, setSessionType] = useState('');
  const [location, setLocation] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [objectives, setObjectives] = useState('');
  const [interventions, setInterventions] = useState('');
  const [response, setResponse] = useState('');
  const [plan, setPlan] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const structuredNotes: Record<string, string> = {};
    if (objectives) structuredNotes.objectives = objectives;
    if (interventions) structuredNotes.interventions = interventions;
    if (response) structuredNotes.response = response;
    if (plan) structuredNotes.plan = plan;

    createSession.mutate(
      {
        caseId,
        data: {
          scheduledAt: new Date(scheduledAt).toISOString(),
          sessionType: sessionType || undefined,
          location: location || undefined,
          actualDuration: Number(duration),
          attendanceStatus: attendance,
          noteFormat,
          rawNotes: rawNotes || undefined,
          structuredNotes:
            Object.keys(structuredNotes).length > 0
              ? structuredNotes
              : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Session note created successfully' });
          router.push(`/${caseId}/sessions`);
        },
        onError: () => {
          toast({ title: 'Failed to create session note', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">New Session Note</h1>
      <p className="text-gray-500 mb-6">
        Document a clinical session with structured notes
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Session Details */}
        <Card className="p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Session Details
            </h2>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledAt">Date *</Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Note Format</Label>
                <Select value={noteFormat} onValueChange={setNoteFormat}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionType">Session Type</Label>
                <Input
                  id="sessionType"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  placeholder="e.g., Individual, Group"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Office, Telehealth"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section: Clinical Notes */}
        <Card className="p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Clinical Notes
            </h2>
            <span className="text-sm text-gray-400 ml-1">(SOAP Format)</span>
          </div>

          <div className="space-y-5">
            <div>
              <Label htmlFor="rawNotes">Raw Session Notes</Label>
              <Textarea
                id="rawNotes"
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Quick notes from the session — you can enhance these with AI later"
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm font-medium text-gray-700 mb-4">
                Structured Notes
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="objectives">
                    <span className="text-teal-600 font-semibold">S</span> — Subjective / Objectives
                  </Label>
                  <Textarea
                    id="objectives"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="Session objectives, client-reported symptoms, subjective observations"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="interventions">
                    <span className="text-teal-600 font-semibold">O</span> — Objective / Interventions
                  </Label>
                  <Textarea
                    id="interventions"
                    value={interventions}
                    onChange={(e) => setInterventions(e.target.value)}
                    placeholder="Interventions used, measurable observations, clinical techniques applied"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="response">
                    <span className="text-teal-600 font-semibold">A</span> — Assessment / Response
                  </Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="How the client responded, clinical assessment, progress evaluation"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="plan">
                    <span className="text-teal-600 font-semibold">P</span> — Plan
                  </Label>
                  <Textarea
                    id="plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Plan for next session, homework, follow-up actions"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={createSession.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {createSession.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Session Note
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
