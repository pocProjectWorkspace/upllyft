'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useGenerateWorksheet,
  useWorksheetStatus,
  useChildScreenings,
  useScreeningSummary,
  useIEPGoals,
  useSessionNotes,
} from '@/hooks/use-worksheets';
import { downloadWorksheetPdf } from '@/lib/api/worksheets';
import type { WorksheetType, WorksheetDataSource, WorksheetDifficulty, WorksheetColorMode, GenerateWorksheetInput } from '@/lib/api/worksheets';
import {
  worksheetTypeLabels,
  dataSourceLabels,
  difficultyLabels,
  domainLabels,
  subTypeLabels,
  colorModeLabels,
} from '@/lib/utils';

const STEPS = ['Data Source', 'Type', 'Customize', 'Generate', 'Download'];

const DATA_SOURCES: { value: WorksheetDataSource; desc: string }[] = [
  { value: 'MANUAL', desc: 'Enter child details and preferences manually' },
  { value: 'SCREENING', desc: 'Use completed UFMF screening results' },
  { value: 'UPLOADED_REPORT', desc: 'Upload and parse a clinical report' },
  { value: 'IEP_GOALS', desc: 'Select goals from an existing IEP' },
  { value: 'SESSION_NOTES', desc: 'Use notes from therapy sessions' },
];

const WORKSHEET_TYPES: { value: WorksheetType; desc: string }[] = [
  { value: 'ACTIVITY', desc: 'Interactive activities like matching, sorting, tracing, and more' },
  { value: 'VISUAL_SUPPORT', desc: 'Visual schedules, social stories, and emotion tools' },
  { value: 'STRUCTURED_PLAN', desc: 'Weekly plans and daily routine organizers' },
];

const VISUAL_SUB_TYPES = ['visual_schedule', 'social_story', 'emotion_thermometer'] as const;
const PLAN_SUB_TYPES = ['weekly_plan', 'daily_routine'] as const;
const DURATIONS = ['10', '15', '20', '30', '45', '60'];
const ALL_DOMAINS = Object.keys(domainLabels);

export default function CreateWorksheetPage() {
  const router = useRouter();
  const generateMutation = useGenerateWorksheet();

  // Wizard step
  const [step, setStep] = useState(0);

  // Step 1 — Data Source
  const [dataSource, setDataSource] = useState<WorksheetDataSource | ''>('');
  const [childAge, setChildAge] = useState('');
  const [conditions, setConditions] = useState('');
  const [devNotes, setDevNotes] = useState('');
  const [childIdInput, setChildIdInput] = useState('');
  const [activeChildId, setActiveChildId] = useState('');
  const [caseIdInput, setCaseIdInput] = useState('');
  const [activeCaseId, setActiveCaseId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  // Data source queries
  const screeningsQuery = useChildScreenings(activeChildId);
  const screeningSummaryQuery = useScreeningSummary(selectedAssessmentId);
  const iepGoalsQuery = useIEPGoals(activeCaseId);
  const sessionNotesQuery = useSessionNotes(activeCaseId);

  // Step 2 — Type
  const [wsType, setWsType] = useState<WorksheetType | ''>('');
  const [subType, setSubType] = useState('');

  // Step 3 — Customize
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<WorksheetDifficulty>('FOUNDATIONAL');
  const [interests, setInterests] = useState('');
  const [duration, setDuration] = useState('20');
  const [colorMode, setColorMode] = useState<WorksheetColorMode>('FULL_COLOR');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Step 4 — Generate
  const [generatedId, setGeneratedId] = useState('');
  const statusQuery = useWorksheetStatus(generatedId, !!generatedId);
  const wsStatus = statusQuery.data?.status;
  const pdfUrl = statusQuery.data?.pdfUrl;

  // ── Validation ──
  function canNext(): boolean {
    if (step === 0) return !!dataSource;
    if (step === 1) {
      if (!wsType) return false;
      if (wsType === 'VISUAL_SUPPORT' && !subType) return false;
      if (wsType === 'STRUCTURED_PLAN' && !subType) return false;
      return true;
    }
    if (step === 2) return selectedDomains.length > 0;
    return true;
  }

  function toggleDomain(d: string) {
    setSelectedDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  // ── Generate ──
  async function handleGenerate() {
    if (!dataSource || !wsType) return;
    const input: GenerateWorksheetInput = {
      dataSource,
      type: wsType,
      ...(subType && { subType }),
      targetDomains: selectedDomains,
      difficulty,
      ...(interests && { interests }),
      ...(duration && { duration: `${duration} minutes` }),
      colorMode,
      ...(specialInstructions && { specialInstructions }),
    };
    if (dataSource === 'MANUAL' && childAge) {
      input.manualInput = {
        childAge: Number(childAge),
        ...(conditions && { conditions: conditions.split(',').map((c) => c.trim()) }),
        ...(devNotes && { developmentalNotes: devNotes }),
      };
    }
    if (dataSource === 'SCREENING' && selectedAssessmentId && activeChildId) {
      input.screeningInput = { assessmentId: selectedAssessmentId, childId: activeChildId };
      input.childId = activeChildId;
    }
    if (dataSource === 'UPLOADED_REPORT' && childIdInput.trim()) {
      input.childId = childIdInput.trim();
    }
    if (dataSource === 'IEP_GOALS' && activeCaseId && selectedGoalIds.length > 0) {
      input.iepGoalsInput = { caseId: activeCaseId, goalIds: selectedGoalIds };
      input.caseId = activeCaseId;
    }
    if (dataSource === 'SESSION_NOTES' && activeCaseId && selectedSessionIds.length > 0) {
      input.sessionNotesInput = { caseId: activeCaseId, sessionIds: selectedSessionIds };
      input.caseId = activeCaseId;
    }
    const ws = await generateMutation.mutateAsync(input);
    setGeneratedId(ws.id);
  }

  // ── Step Renderers ──

  function renderStepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? 'bg-teal-500 text-white'
                  : i === step
                    ? 'bg-teal-600 text-white ring-2 ring-teal-300'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs hidden sm:inline ${i === step ? 'text-teal-700 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-300" />}
          </div>
        ))}
      </div>
    );
  }

  function renderStep0() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Choose a Data Source</h2>
        <p className="text-sm text-gray-500">Select where the worksheet content should come from.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DATA_SOURCES.map((ds) => (
            <Card
              key={ds.value}
              className={`p-4 cursor-pointer transition-all ${
                dataSource === ds.value
                  ? 'ring-2 ring-teal-500 bg-teal-50/50'
                  : 'hover:shadow-sm'
              }`}
              onClick={() => { setDataSource(ds.value); }}
            >
              <h3 className="font-medium text-gray-900">{dataSourceLabels[ds.value]}</h3>
              <p className="text-xs text-gray-500 mt-1">{ds.desc}</p>
            </Card>
          ))}
        </div>

        {dataSource === 'MANUAL' && (
          <Card className="p-5 space-y-4 mt-4">
            <h3 className="font-medium text-gray-900">Manual Input Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Child Age (years)</Label>
                <Input type="number" min={1} max={18} value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="e.g. 6" />
              </div>
              <div>
                <Label>Conditions (comma-separated)</Label>
                <Input value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. ADHD, Autism" />
              </div>
            </div>
            <div>
              <Label>Developmental Notes</Label>
              <Textarea value={devNotes} onChange={(e) => setDevNotes(e.target.value)} placeholder="Any relevant details about the child's development..." rows={3} />
            </div>
          </Card>
        )}

        {dataSource === 'SCREENING' && (
          <Card className="p-5 space-y-4 mt-4">
            <h3 className="font-medium text-gray-900">Select Screening Results</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Child ID</Label>
                <Input
                  placeholder="Enter child ID"
                  value={childIdInput}
                  onChange={(e) => setChildIdInput(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveChildId(childIdInput.trim())}
                disabled={!childIdInput.trim()}
              >
                Load Screenings
              </Button>
            </div>
            {screeningsQuery.isLoading && (
              <p className="text-sm text-gray-500">Loading screenings...</p>
            )}
            {screeningsQuery.data?.assessments && screeningsQuery.data.assessments.length > 0 && (
              <div className="space-y-2">
                <Label>Select a completed screening</Label>
                {screeningsQuery.data.assessments.map((a) => (
                  <Card
                    key={a.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedAssessmentId === a.id ? 'ring-2 ring-teal-500 bg-teal-50/50' : 'hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedAssessmentId(a.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Age Group: {a.ageGroup}</span>
                      <Badge color={a.status === 'COMPLETED' ? 'green' : 'gray'}>{a.status}</Badge>
                    </div>
                    {a.completedAt && <p className="text-xs text-gray-500 mt-1">Completed: {new Date(a.completedAt).toLocaleDateString()}</p>}
                  </Card>
                ))}
              </div>
            )}
            {screeningsQuery.data?.assessments?.length === 0 && activeChildId && (
              <p className="text-sm text-gray-500">No screenings found for this child.</p>
            )}
            {screeningSummaryQuery.data && (
              <div className="bg-teal-50 rounded-lg p-3">
                <p className="text-sm font-medium text-teal-800 mb-1">Screening Summary</p>
                <p className="text-xs text-teal-600">
                  Suggested domains: {screeningSummaryQuery.data.suggestedWorksheetDomains.join(', ')}
                </p>
              </div>
            )}
          </Card>
        )}

        {dataSource === 'UPLOADED_REPORT' && (
          <Card className="p-5 space-y-4 mt-4">
            <h3 className="font-medium text-gray-900">Upload Clinical Report</h3>
            <p className="text-sm text-gray-500">
              Report parsing will extract child details, conditions, and developmental domains from uploaded clinical reports. Enter a child ID to associate the worksheet.
            </p>
            <div>
              <Label>Child ID (optional)</Label>
              <Input
                placeholder="Enter child ID"
                value={childIdInput}
                onChange={(e) => setChildIdInput(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">
              Report upload and parsing will run during generation. Proceed to the next step.
            </p>
          </Card>
        )}

        {dataSource === 'IEP_GOALS' && (
          <Card className="p-5 space-y-4 mt-4">
            <h3 className="font-medium text-gray-900">Select IEP Goals</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Case ID</Label>
                <Input
                  placeholder="Enter case ID"
                  value={caseIdInput}
                  onChange={(e) => setCaseIdInput(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveCaseId(caseIdInput.trim())}
                disabled={!caseIdInput.trim()}
              >
                Load Goals
              </Button>
            </div>
            {iepGoalsQuery.isLoading && <p className="text-sm text-gray-500">Loading IEP goals...</p>}
            {iepGoalsQuery.data?.goals && iepGoalsQuery.data.goals.length > 0 && (
              <div className="space-y-2">
                <Label>Select goals to focus on</Label>
                {iepGoalsQuery.data.goals.map((goal) => (
                  <label
                    key={goal.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedGoalIds.includes(goal.id)
                        ? 'border-teal-500 bg-teal-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGoalIds.includes(goal.id)}
                      onChange={() =>
                        setSelectedGoalIds((prev) =>
                          prev.includes(goal.id) ? prev.filter((id) => id !== goal.id) : [...prev, goal.id]
                        )
                      }
                      className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{goal.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Domain: {goal.domain} &middot; {goal.status}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {iepGoalsQuery.data?.goals?.length === 0 && activeCaseId && (
              <p className="text-sm text-gray-500">No IEP goals found for this case.</p>
            )}
          </Card>
        )}

        {dataSource === 'SESSION_NOTES' && (
          <Card className="p-5 space-y-4 mt-4">
            <h3 className="font-medium text-gray-900">Select Session Notes</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Case ID</Label>
                <Input
                  placeholder="Enter case ID"
                  value={caseIdInput}
                  onChange={(e) => setCaseIdInput(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveCaseId(caseIdInput.trim())}
                disabled={!caseIdInput.trim()}
              >
                Load Sessions
              </Button>
            </div>
            {sessionNotesQuery.isLoading && <p className="text-sm text-gray-500">Loading session notes...</p>}
            {sessionNotesQuery.data?.sessions && sessionNotesQuery.data.sessions.length > 0 && (
              <div className="space-y-2">
                <Label>Select sessions to use</Label>
                {sessionNotesQuery.data.sessions.map((session) => (
                  <label
                    key={session.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedSessionIds.includes(session.id)
                        ? 'border-teal-500 bg-teal-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(session.id)}
                      onChange={() =>
                        setSelectedSessionIds((prev) =>
                          prev.includes(session.id) ? prev.filter((id) => id !== session.id) : [...prev, session.id]
                        )
                      }
                      className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{new Date(session.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{session.notes}</p>
                      {session.progress && <p className="text-xs text-teal-600 mt-0.5">Progress: {session.progress}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {sessionNotesQuery.data?.sessions?.length === 0 && activeCaseId && (
              <p className="text-sm text-gray-500">No session notes found for this case.</p>
            )}
          </Card>
        )}
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Select Worksheet Type</h2>
        <p className="text-sm text-gray-500">Choose the kind of worksheet to generate.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WORKSHEET_TYPES.map((wt) => (
            <Card
              key={wt.value}
              className={`p-4 cursor-pointer transition-all ${
                wsType === wt.value ? 'ring-2 ring-teal-500 bg-teal-50/50' : 'hover:shadow-sm'
              }`}
              onClick={() => { setWsType(wt.value); setSubType(''); }}
            >
              <h3 className="font-medium text-gray-900">{worksheetTypeLabels[wt.value]}</h3>
              <p className="text-xs text-gray-500 mt-1">{wt.desc}</p>
            </Card>
          ))}
        </div>

        {wsType === 'VISUAL_SUPPORT' && (
          <div className="space-y-2 mt-2">
            <h3 className="text-sm font-medium text-gray-700">Select Sub-Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VISUAL_SUB_TYPES.map((st) => (
                <Card
                  key={st}
                  className={`p-3 cursor-pointer transition-all ${
                    subType === st ? 'ring-2 ring-teal-500 bg-teal-50/50' : 'hover:shadow-sm'
                  }`}
                  onClick={() => setSubType(st)}
                >
                  <h3 className="font-medium text-gray-900 text-sm">{subTypeLabels[st]}</h3>
                </Card>
              ))}
            </div>
          </div>
        )}

        {wsType === 'STRUCTURED_PLAN' && (
          <div className="space-y-2 mt-2">
            <h3 className="text-sm font-medium text-gray-700">Select Sub-Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_SUB_TYPES.map((st) => (
                <Card
                  key={st}
                  className={`p-3 cursor-pointer transition-all ${
                    subType === st ? 'ring-2 ring-teal-500 bg-teal-50/50' : 'hover:shadow-sm'
                  }`}
                  onClick={() => setSubType(st)}
                >
                  <h3 className="font-medium text-gray-900 text-sm">{subTypeLabels[st]}</h3>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Customize Your Worksheet</h2>

        {/* Domains */}
        <div>
          <Label className="mb-2 block">Developmental Domains</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDomain(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDomains.includes(d)
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {domainLabels[d]}
              </button>
            ))}
          </div>
          {selectedDomains.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Select at least one domain.</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <Label>Difficulty Level</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as WorksheetDifficulty)}>
            <SelectTrigger className="w-56 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['FOUNDATIONAL', 'DEVELOPING', 'STRENGTHENING'] as WorksheetDifficulty[]).map((d) => (
                <SelectItem key={d} value={d}>{difficultyLabels[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interests */}
        <div>
          <Label>Child's Interests</Label>
          <Textarea
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. dinosaurs, space, cooking, animals..."
            rows={2}
            className="mt-1"
          />
        </div>

        {/* Duration & Color Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color Mode</Label>
            <Select value={colorMode} onValueChange={(v) => setColorMode(v as WorksheetColorMode)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['FULL_COLOR', 'GRAYSCALE', 'LINE_ART'] as WorksheetColorMode[]).map((cm) => (
                  <SelectItem key={cm} value={cm}>{colorModeLabels[cm]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <Label>Special Instructions (optional)</Label>
          <Textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any specific requirements or adaptations..."
            rows={2}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  function renderStep3() {
    const isGenerating = generateMutation.isPending || wsStatus === 'GENERATING';
    const isPublished = wsStatus === 'PUBLISHED';

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Preview & Generate</h2>

        {/* Summary */}
        <Card className="p-5 space-y-3">
          <h3 className="font-medium text-gray-900">Summary</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <span className="text-gray-500">Data Source</span>
            <span className="text-gray-900">{dataSource ? dataSourceLabels[dataSource] : '-'}</span>
            <span className="text-gray-500">Type</span>
            <span className="text-gray-900">
              {wsType ? worksheetTypeLabels[wsType] : '-'}
              {subType ? ` / ${subTypeLabels[subType]}` : ''}
            </span>
            <span className="text-gray-500">Domains</span>
            <span className="text-gray-900">{selectedDomains.map((d) => domainLabels[d]).join(', ') || '-'}</span>
            <span className="text-gray-500">Difficulty</span>
            <span className="text-gray-900">{difficultyLabels[difficulty]}</span>
            <span className="text-gray-500">Duration</span>
            <span className="text-gray-900">{duration} minutes</span>
            <span className="text-gray-500">Color Mode</span>
            <span className="text-gray-900">{colorModeLabels[colorMode]}</span>
            {interests && (
              <>
                <span className="text-gray-500">Interests</span>
                <span className="text-gray-900">{interests}</span>
              </>
            )}
            {specialInstructions && (
              <>
                <span className="text-gray-500">Instructions</span>
                <span className="text-gray-900">{specialInstructions}</span>
              </>
            )}
          </div>
        </Card>

        {/* Generate button / status */}
        {!generatedId ? (
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full sm:w-auto">
            {generateMutation.isPending ? 'Generating...' : 'Generate Worksheet'}
          </Button>
        ) : isGenerating ? (
          <Card className="p-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Generating your worksheet...</p>
            <p className="text-xs text-gray-400">AI is creating content, illustrations, and PDF. This may take 30-60 seconds.</p>
          </Card>
        ) : isPublished ? (
          <Card className="p-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Worksheet generated successfully!</p>
            <p className="text-xs text-gray-500">Click Next to download your PDF.</p>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-sm text-gray-600">Status: <Badge color="yellow">{wsStatus ?? 'Unknown'}</Badge></p>
          </Card>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Your Worksheet is Ready!</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Your AI-generated worksheet has been created and saved to your library.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            onClick={() => downloadWorksheetPdf(generatedId, undefined, pdfUrl ?? undefined)}
            disabled={!pdfUrl && wsStatus !== 'PUBLISHED'}
          >
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Go to Library
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/${generatedId}`)}>
            View Worksheet
          </Button>
        </div>
      </div>
    );
  }

  // ── Navigation guards ──
  function handleNext() {
    if (step === 3 && !generatedId) return; // must generate first
    if (step === 3 && wsStatus !== 'PUBLISHED') return; // must finish generating
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <ResourcesShell>
      <div className="max-w-3xl mx-auto">
        {renderStepIndicator()}

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                !canNext() ||
                (step === 3 && (!generatedId || wsStatus !== 'PUBLISHED'))
              }
            >
              {step === 3 ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
