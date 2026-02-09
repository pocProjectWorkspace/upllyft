'use client';

import { useState } from 'react';
import {
  useIEPs,
  useIEP,
  useCreateIEP,
  useUpdateIEP,
  useApproveIEP,
  useCreateNewIEPVersion,
  useAddIEPGoal,
  useUpdateIEPGoal,
  useBulkAddIEPGoals,
  useGenerateIEPFromScreening,
  useSuggestIEPGoals,
  useIEPTemplates,
  useSearchGoalBank,
} from '@/hooks/use-cases';
import { formatDate, iepStatusColors, iepStatusLabels } from '@/lib/utils';
import type { IEP, IEPGoal, IEPTemplate, GoalBankItem } from '@/lib/api/cases';
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Card,
  Progress,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useToast,
} from '@upllyft/ui';
import {
  Plus,
  Loader2,
  Target,
  Sparkles,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  FileText,
  BookOpen,
  Pencil,
  Save,
  X,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';

const DOMAINS = [
  'COMMUNICATION',
  'MOTOR',
  'SOCIAL',
  'COGNITIVE',
  'BEHAVIORAL',
  'SELF_CARE',
  'ACADEMIC',
];

const STATUS_BADGE_COLORS: Record<string, 'gray' | 'yellow' | 'green' | 'blue' | 'purple' | 'red'> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'green',
  ACTIVE: 'blue',
  IN_REVIEW: 'purple',
  ARCHIVED: 'gray',
};

const GOAL_STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  ACHIEVED: 'green',
  DISCONTINUED: 'red',
};

interface IEPsTabProps {
  caseId: string;
}

export function IEPsTab({ caseId }: IEPsTabProps) {
  const { toast } = useToast();

  // ── View state ──
  const [selectedIepId, setSelectedIepId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showGoalBank, setShowGoalBank] = useState(false);
  const [suggestDomain, setSuggestDomain] = useState('COMMUNICATION');
  const [suggestions, setSuggestions] = useState<Record<string, unknown>[]>([]);
  const [goalBankDomain, setGoalBankDomain] = useState('');

  // ── Form state ──
  const [newIEP, setNewIEP] = useState({
    title: '',
    startDate: '',
    endDate: '',
    templateId: '',
    reviewDate: '',
  });
  const [newGoal, setNewGoal] = useState({
    domain: 'COMMUNICATION',
    goalText: '',
    targetDate: '',
    measurableCriteria: '',
    baselineLevel: '',
  });

  // ── Meeting Notes / Services editing ──
  const [editingMeetingNotes, setEditingMeetingNotes] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [meetingNotesForm, setMeetingNotesForm] = useState({
    attendees: '',
    decisions: '',
    actionItems: '',
    notes: '',
    date: '',
  });
  const [servicesForm, setServicesForm] = useState('');

  // ── Queries ──
  const { data: iepsData, isLoading } = useIEPs(caseId);
  const { data: iepDetail } = useIEP(caseId, selectedIepId ?? '');
  const { data: templatesData } = useIEPTemplates();
  const { data: goalBankData, isLoading: loadingGoalBank } = useSearchGoalBank(
    showGoalBank ? { domain: goalBankDomain || undefined } : undefined
  );

  // ── Mutations ──
  const createIEP = useCreateIEP();
  const updateIEP = useUpdateIEP();
  const approveIEP = useApproveIEP();
  const createVersion = useCreateNewIEPVersion();
  const addGoal = useAddIEPGoal();
  const updateGoal = useUpdateIEPGoal();
  const bulkAddGoals = useBulkAddIEPGoals();
  const generateFromScreening = useGenerateIEPFromScreening();
  const suggestGoals = useSuggestIEPGoals();

  // ── Derived data ──
  const ieps: IEP[] = Array.isArray(iepsData) ? iepsData : [];
  const templates: IEPTemplate[] = Array.isArray(templatesData)
    ? templatesData
    : [];
  const goalBank: GoalBankItem[] = Array.isArray(goalBankData)
    ? goalBankData
    : [];
  const selectedIEP: IEP | null = (iepDetail as IEP) ?? null;

  // ── Handlers ──

  const handleCreate = async () => {
    if (!newIEP.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    try {
      const result = await createIEP.mutateAsync({
        caseId,
        data: {
          title: newIEP.title,
          templateId: newIEP.templateId || undefined,
          reviewDate: newIEP.reviewDate
            ? new Date(newIEP.reviewDate).toISOString()
            : undefined,
        },
      });
      setShowCreate(false);
      setNewIEP({ title: '', startDate: '', endDate: '', templateId: '', reviewDate: '' });
      const resultId = (result as Record<string, unknown>)?.id;
      if (typeof resultId === 'string') setSelectedIepId(resultId);
    } catch {
      // Error handled by hook
    }
  };

  const handleApprove = async (role: string) => {
    if (!selectedIepId) return;
    try {
      await approveIEP.mutateAsync({ caseId, iepId: selectedIepId, data: { role } });
    } catch {
      // Error handled by hook
    }
  };

  const handleAddGoal = async () => {
    if (!selectedIepId || !newGoal.goalText.trim()) return;
    try {
      await addGoal.mutateAsync({
        caseId,
        iepId: selectedIepId,
        data: {
          domain: newGoal.domain,
          goalText: newGoal.goalText,
          targetDate: newGoal.targetDate
            ? new Date(newGoal.targetDate).toISOString()
            : undefined,
        },
      });
      setShowAddGoal(false);
      setNewGoal({
        domain: 'COMMUNICATION',
        goalText: '',
        targetDate: '',
        measurableCriteria: '',
        baselineLevel: '',
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleGenerateAI = async () => {
    try {
      const result = await generateFromScreening.mutateAsync({
        caseId,
        data: {},
      });
      const resultId = (result as Record<string, unknown>)?.id;
      if (typeof resultId === 'string') setSelectedIepId(resultId);
    } catch {
      // Error handled by hook
    }
  };

  const handleSuggestGoals = async (domain: string) => {
    try {
      const result = await suggestGoals.mutateAsync({
        caseId,
        data: { domain, count: 5 },
      });
      const resultData = result as Record<string, unknown>;
      const goals = Array.isArray(resultData?.goals)
        ? resultData.goals
        : Array.isArray(result)
          ? result
          : [];
      setSuggestions(goals as Record<string, unknown>[]);
    } catch {
      // Error handled by hook
    }
  };

  const handleAddSuggestion = async (suggestion: Record<string, unknown>) => {
    if (!selectedIepId) return;
    const domain =
      typeof suggestion.domain === 'string' ? suggestion.domain : 'COMMUNICATION';
    const goalText =
      typeof suggestion.goalText === 'string'
        ? suggestion.goalText
        : typeof suggestion.description === 'string'
          ? suggestion.description
          : '';
    try {
      await addGoal.mutateAsync({
        caseId,
        iepId: selectedIepId,
        data: { domain, goalText },
      });
      toast({ title: 'Goal added from suggestion' });
    } catch {
      // Error handled by hook
    }
  };

  const handleAddFromGoalBank = async (item: GoalBankItem) => {
    if (!selectedIepId) return;
    try {
      await addGoal.mutateAsync({
        caseId,
        iepId: selectedIepId,
        data: {
          domain: item.domain || 'COMMUNICATION',
          goalText: item.goalText,
        },
      });
      toast({ title: 'Goal added from bank' });
    } catch {
      // Error handled by hook
    }
  };

  const handleNewVersion = async () => {
    if (!selectedIepId) return;
    try {
      const result = await createVersion.mutateAsync({
        caseId,
        iepId: selectedIepId,
      });
      const resultId = (result as Record<string, unknown>)?.id;
      if (typeof resultId === 'string') setSelectedIepId(resultId);
    } catch {
      // Error handled by hook
    }
  };

  const openMeetingNotesEditor = () => {
    const mn = (selectedIEP?.meetingNotes as Record<string, unknown>) || {};
    const attendees = Array.isArray(mn.attendees)
      ? (mn.attendees as string[]).join(', ')
      : '';
    const decisions = Array.isArray(mn.decisions)
      ? (mn.decisions as string[]).join('\n')
      : '';
    const actionItems = Array.isArray(mn.actionItems)
      ? (mn.actionItems as string[]).join('\n')
      : '';
    const notes = typeof mn.notes === 'string' ? mn.notes : '';
    const date = typeof mn.date === 'string' ? mn.date : '';
    setMeetingNotesForm({ attendees, decisions, actionItems, notes, date });
    setEditingMeetingNotes(true);
  };

  const handleSaveMeetingNotes = async () => {
    if (!selectedIepId) return;
    try {
      await updateIEP.mutateAsync({
        caseId,
        iepId: selectedIepId,
        data: {
          meetingNotes: {
            attendees: meetingNotesForm.attendees
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            decisions: meetingNotesForm.decisions.split('\n').filter(Boolean),
            actionItems: meetingNotesForm.actionItems.split('\n').filter(Boolean),
            notes: meetingNotesForm.notes,
            date: meetingNotesForm.date || undefined,
          },
        },
      });
      setEditingMeetingNotes(false);
    } catch {
      // Error handled by hook
    }
  };

  const openServicesEditor = () => {
    const st = selectedIEP?.servicesTracking;
    setServicesForm(
      typeof st === 'object' && st !== null
        ? JSON.stringify(st, null, 2)
        : typeof st === 'string'
          ? st
          : ''
    );
    setEditingServices(true);
  };

  const handleSaveServices = async () => {
    if (!selectedIepId) return;
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(servicesForm);
      } catch {
        parsed = servicesForm;
      }
      await updateIEP.mutateAsync({
        caseId,
        iepId: selectedIepId,
        data: { servicesTracking: parsed as Record<string, unknown> },
      });
      setEditingServices(false);
    } catch {
      // Error handled by hook
    }
  };

  // ── Loading state ──

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // ── Detail View ──

  if (selectedIEP && selectedIepId) {
    const meetingNotes =
      selectedIEP.meetingNotes && typeof selectedIEP.meetingNotes === 'object'
        ? (selectedIEP.meetingNotes as Record<string, unknown>)
        : null;
    const servicesTracking = selectedIEP.servicesTracking;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedIepId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h3 className="font-semibold text-lg">
            IEP v{selectedIEP.version ?? 1}
          </h3>
          <Badge color={STATUS_BADGE_COLORS[selectedIEP.status] ?? 'gray'}>
            {iepStatusLabels[selectedIEP.status] ?? selectedIEP.status}
          </Badge>
        </div>

        {/* Meta Card */}
        <Card className="p-4 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Review Date</span>
              <p className="font-medium">{formatDate(selectedIEP.reviewDate)}</p>
            </div>
            <div>
              <span className="text-gray-500">Version</span>
              <p className="font-medium">{selectedIEP.version ?? 1}</p>
            </div>
            <div>
              <span className="text-gray-500">Therapist Approval</span>
              <p className="font-medium">
                {selectedIEP.approvedByTherapistAt ? (
                  <span className="text-green-600">Approved</span>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Parent Approval</span>
              <p className="font-medium">
                {selectedIEP.approvedByParentAt ? (
                  <span className="text-green-600">Approved</span>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove('therapist')}
              disabled={approveIEP.isPending}
            >
              {approveIEP.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Therapist Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove('parent')}
              disabled={approveIEP.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Parent Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNewVersion}
              disabled={createVersion.isPending}
            >
              {createVersion.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              New Version
            </Button>
          </div>
        </Card>

        {/* Goals Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">
            Goals ({selectedIEP.goals?.length ?? 0})
          </h4>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalBank(true)}
            >
              <BookOpen className="h-4 w-4 mr-1" /> Goal Bank
            </Button>
            <div className="flex items-center gap-1">
              <Select value={suggestDomain} onValueChange={setSuggestDomain}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSuggestGoals(suggestDomain)}
                disabled={suggestGoals.isPending}
              >
                {suggestGoals.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1">AI Suggest</span>
              </Button>
            </div>
            <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Domain</Label>
                    <Select
                      value={newGoal.domain}
                      onValueChange={(v) =>
                        setNewGoal({ ...newGoal, domain: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOMAINS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Goal Description</Label>
                    <Textarea
                      value={newGoal.goalText}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, goalText: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={newGoal.targetDate}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, targetDate: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    onClick={handleAddGoal}
                    disabled={addGoal.isPending}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {addGoal.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Card className="p-4 border border-purple-200 bg-purple-50">
            <h5 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Suggested Goals
            </h5>
            <div className="space-y-2">
              {suggestions.map((s, i) => {
                const desc =
                  typeof s.goalText === 'string'
                    ? s.goalText
                    : typeof s.description === 'string'
                      ? s.description
                      : '';
                const rationale =
                  typeof s.rationale === 'string' ? s.rationale : '';
                return (
                  <div
                    key={i}
                    className="flex items-start justify-between bg-white rounded p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{desc}</p>
                      {rationale && (
                        <p className="text-xs text-gray-500 mt-1">
                          {rationale}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSuggestion(s)}
                      disabled={addGoal.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setSuggestions([])}
            >
              Dismiss
            </Button>
          </Card>
        )}

        {/* Goals List */}
        {!selectedIEP.goals || selectedIEP.goals.length === 0 ? (
          <Card className="p-6 text-center border border-gray-100">
            <Target className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No goals added yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedIEP.goals.map((goal: IEPGoal) => (
              <Card key={goal.id} className="p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color="gray">{goal.domain}</Badge>
                      <Badge color={GOAL_STATUS_COLORS[goal.status] ?? 'gray'}>
                        {goal.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{goal.goalText}</p>
                    {goal.targetDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Target: {formatDate(goal.targetDate)}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold">
                      {goal.currentProgress ?? 0}%
                    </p>
                  </div>
                </div>
                <Progress value={goal.currentProgress ?? 0} className="mt-3 h-2" />
              </Card>
            ))}
          </div>
        )}

        {/* Accommodations */}
        {selectedIEP.accommodations && (
          <Card className="p-4 border border-gray-100">
            <h4 className="font-semibold mb-2">Accommodations</h4>
            <p className="text-sm whitespace-pre-wrap">
              {typeof selectedIEP.accommodations === 'string'
                ? selectedIEP.accommodations
                : JSON.stringify(selectedIEP.accommodations, null, 2)}
            </p>
          </Card>
        )}

        {/* Meeting Notes */}
        <Card className="p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Meeting Notes
            </h4>
            {!editingMeetingNotes ? (
              <Button variant="ghost" size="sm" onClick={openMeetingNotesEditor}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMeetingNotes(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveMeetingNotes}
                  disabled={updateIEP.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateIEP.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
          {editingMeetingNotes ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Meeting Date</Label>
                <Input
                  type="date"
                  value={meetingNotesForm.date}
                  onChange={(e) =>
                    setMeetingNotesForm({
                      ...meetingNotesForm,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Attendees (comma-separated)</Label>
                <Input
                  value={meetingNotesForm.attendees}
                  onChange={(e) =>
                    setMeetingNotesForm({
                      ...meetingNotesForm,
                      attendees: e.target.value,
                    })
                  }
                  placeholder="e.g., Dr. Smith, Jane Parent, School Rep"
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={meetingNotesForm.notes}
                  onChange={(e) =>
                    setMeetingNotesForm({
                      ...meetingNotesForm,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">Decisions (one per line)</Label>
                <Textarea
                  value={meetingNotesForm.decisions}
                  onChange={(e) =>
                    setMeetingNotesForm({
                      ...meetingNotesForm,
                      decisions: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder={'Decision 1\nDecision 2'}
                />
              </div>
              <div>
                <Label className="text-xs">Action Items (one per line)</Label>
                <Textarea
                  value={meetingNotesForm.actionItems}
                  onChange={(e) =>
                    setMeetingNotesForm({
                      ...meetingNotesForm,
                      actionItems: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder={'Action 1\nAction 2'}
                />
              </div>
            </div>
          ) : meetingNotes ? (
            <div className="space-y-2 text-sm">
              {typeof meetingNotes.date === 'string' && meetingNotes.date && (
                <p>
                  <span className="text-gray-500">Date:</span>{' '}
                  {formatDate(meetingNotes.date)}
                </p>
              )}
              {Array.isArray(meetingNotes.attendees) &&
                (meetingNotes.attendees as string[]).length > 0 && (
                  <div>
                    <span className="text-gray-500">Attendees:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(meetingNotes.attendees as string[]).map(
                        (a: string, i: number) => (
                          <Badge key={i} color="gray">
                            {a}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              {typeof meetingNotes.notes === 'string' && meetingNotes.notes && (
                <div>
                  <span className="text-gray-500">Notes:</span>
                  <p className="mt-1 whitespace-pre-wrap">
                    {meetingNotes.notes}
                  </p>
                </div>
              )}
              {Array.isArray(meetingNotes.decisions) &&
                (meetingNotes.decisions as string[]).length > 0 && (
                  <div>
                    <span className="text-gray-500">Decisions:</span>
                    <ul className="list-disc list-inside mt-1">
                      {(meetingNotes.decisions as string[]).map(
                        (d: string, i: number) => (
                          <li key={i}>{d}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              {Array.isArray(meetingNotes.actionItems) &&
                (meetingNotes.actionItems as string[]).length > 0 && (
                  <div>
                    <span className="text-gray-500">Action Items:</span>
                    <ul className="list-disc list-inside mt-1">
                      {(meetingNotes.actionItems as string[]).map(
                        (a: string, i: number) => (
                          <li key={i}>{a}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No meeting notes yet. Click Edit to add.
            </p>
          )}
        </Card>

        {/* Services Tracking */}
        <Card className="p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Services Tracking
            </h4>
            {!editingServices ? (
              <Button variant="ghost" size="sm" onClick={openServicesEditor}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingServices(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveServices}
                  disabled={updateIEP.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateIEP.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
          {editingServices ? (
            <div>
              <Label className="text-xs">Services (JSON format)</Label>
              <Textarea
                value={servicesForm}
                onChange={(e) => setServicesForm(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder='[{"service": "Speech Therapy", "frequency": "2x/week", "duration": "30 min"}]'
              />
            </div>
          ) : servicesTracking ? (
            <div className="text-sm">
              {Array.isArray(servicesTracking) ? (
                <div className="space-y-2">
                  {(servicesTracking as Record<string, unknown>[]).map(
                    (s, i) => {
                      const serviceName =
                        typeof s.service === 'string'
                          ? s.service
                          : typeof s.name === 'string'
                            ? s.name
                            : `Service ${i + 1}`;
                      const frequency =
                        typeof s.frequency === 'string' ? s.frequency : '';
                      const duration =
                        typeof s.duration === 'string' ? s.duration : '';
                      const provider =
                        typeof s.provider === 'string' ? s.provider : '';
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-gray-50 rounded p-2"
                        >
                          <span className="font-medium">{serviceName}</span>
                          <div className="flex gap-2 text-xs text-gray-500">
                            {frequency && <span>{frequency}</span>}
                            {duration && <span>- {duration}</span>}
                            {provider && <span>- {provider}</span>}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">
                  {typeof servicesTracking === 'string'
                    ? servicesTracking
                    : JSON.stringify(servicesTracking, null, 2)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No services tracked yet. Click Edit to add.
            </p>
          )}
        </Card>

        {/* Goal Bank Dialog */}
        <Dialog open={showGoalBank} onOpenChange={setShowGoalBank}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Goal Bank</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Filter by Domain</Label>
                <Select
                  value={goalBankDomain || '_all'}
                  onValueChange={(v) =>
                    setGoalBankDomain(v === '_all' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Domains</SelectItem>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {loadingGoalBank ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                </div>
              ) : goalBank.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No goals found in the bank
                </p>
              ) : (
                <div className="space-y-2">
                  {goalBank.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border rounded-lg p-3"
                    >
                      <div className="flex-1 mr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color="gray">{item.domain}</Badge>
                          {item.condition && (
                            <Badge color="blue">{item.condition}</Badge>
                          )}
                        </div>
                        <p className="text-sm">{item.goalText}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddFromGoalBank(item)}
                        disabled={addGoal.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── List View ──

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">IEPs ({ieps.length})</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateAI}
            disabled={generateFromScreening.isPending}
          >
            {generateFromScreening.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Generate
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button
                variant="primary"
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" /> New IEP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create IEP</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {templates.length > 0 && (
                  <div>
                    <Label>Template (optional)</Label>
                    <Select
                      value={newIEP.templateId || '_none'}
                      onValueChange={(v) =>
                        setNewIEP({
                          ...newIEP,
                          templateId: v === '_none' ? '' : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Start from scratch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Start from scratch</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              {t.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newIEP.templateId &&
                      templates.find((t) => t.id === newIEP.templateId)
                        ?.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {
                            templates.find((t) => t.id === newIEP.templateId)
                              ?.description
                          }
                        </p>
                      )}
                  </div>
                )}
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newIEP.title}
                    onChange={(e) =>
                      setNewIEP({ ...newIEP, title: e.target.value })
                    }
                    placeholder="e.g., Annual IEP 2026"
                  />
                </div>
                <div>
                  <Label>Review Date (optional)</Label>
                  <Input
                    type="date"
                    value={newIEP.reviewDate}
                    onChange={(e) =>
                      setNewIEP({ ...newIEP, reviewDate: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createIEP.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {createIEP.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create IEP
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {ieps.length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No IEPs created yet
          </h3>
          <p className="text-sm text-gray-500">
            Create an IEP or let AI generate one from screening data.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ieps.map((iep) => (
            <Card
              key={iep.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
              onClick={() => setSelectedIepId(iep.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      IEP v{iep.version ?? 1}
                    </span>
                    <Badge
                      color={STATUS_BADGE_COLORS[iep.status] ?? 'gray'}
                    >
                      {iepStatusLabels[iep.status] ?? iep.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {formatDate(iep.createdAt)}
                    {iep.goals && ` - ${iep.goals.length} goals`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
