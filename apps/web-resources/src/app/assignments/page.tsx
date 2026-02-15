'use client';

import { useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import {
  Badge,
  Button,
  Card,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Separator,
  toast,
} from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useSentAssignments,
  useReceivedAssignments,
  useUpdateAssignment,
  useRecordCompletion,
} from '@/hooks/use-worksheets';
import type {
  WorksheetAssignment,
  WorksheetAssignmentStatus,
  AssignmentFilters,
} from '@/lib/api/worksheets';
import {
  assignmentStatusLabels,
  assignmentStatusColors,
  formatShortDate,
  isOverdue,
  getDueDateStyle,
} from '@/lib/utils';

const STATUS_OPTIONS: Array<{ value: WorksheetAssignmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
];

export default function AssignmentsPage() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'THERAPIST';

  if (isTherapist) {
    return (
      <ResourcesShell>
        <TherapistSentAssignments />
      </ResourcesShell>
    );
  }

  return (
    <ResourcesShell>
      <ParentReceivedAssignments />
    </ResourcesShell>
  );
}

// ── Therapist View ──

function TherapistSentAssignments() {
  const [statusFilter, setStatusFilter] = useState<WorksheetAssignmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedAssignment, setSelectedAssignment] = useState<WorksheetAssignment | null>(null);

  const filters: AssignmentFilters = {
    page,
    limit: 10,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  };
  const { data, isLoading } = useSentAssignments(filters);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sent Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">Worksheets you have assigned as homework</p>
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(val) => { setStatusFilter(val as WorksheetAssignmentStatus | 'ALL'); setPage(1); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.data?.length ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">No assignments sent</h3>
          <p className="text-gray-500 text-sm mt-1">You have not assigned any worksheets yet.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((assignment) => (
              <Card
                key={assignment.id}
                className="p-4 card-hover cursor-pointer"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {assignment.worksheet?.title || 'Untitled Worksheet'}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <span>To: {assignment.assignedTo?.name || 'Unknown'}</span>
                      <span>Child: {assignment.child?.nickname || assignment.child?.firstName || 'N/A'}</span>
                      <span>Sent: {formatShortDate(assignment.createdAt)}</span>
                      {assignment.dueDate && (() => {
                        const ds = getDueDateStyle(assignment.dueDate, assignment.status);
                        return <span className={ds.className}>{ds.label}</span>;
                      })()}
                    </div>
                  </div>
                  <Badge
                    color={assignmentStatusColors[assignment.status] as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}
                  >
                    {assignmentStatusLabels[assignment.status]}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 py-2">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Assignment Detail Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={(open) => { if (!open) setSelectedAssignment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.worksheet?.title || 'Worksheet'}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-3 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge
                  color={assignmentStatusColors[selectedAssignment.status] as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}
                >
                  {assignmentStatusLabels[selectedAssignment.status]}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned To</span>
                <span className="text-gray-900">{selectedAssignment.assignedTo?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Child</span>
                <span className="text-gray-900">{selectedAssignment.child?.nickname || selectedAssignment.child?.firstName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sent</span>
                <span className="text-gray-900">{formatShortDate(selectedAssignment.createdAt)}</span>
              </div>
              {selectedAssignment.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className={isOverdue(selectedAssignment.dueDate) && selectedAssignment.status !== 'COMPLETED' ? 'text-red-500' : 'text-gray-900'}>
                    {formatShortDate(selectedAssignment.dueDate)}
                  </span>
                </div>
              )}
              {selectedAssignment.viewedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Viewed At</span>
                  <span className="text-gray-900">{formatShortDate(selectedAssignment.viewedAt)}</span>
                </div>
              )}
              {selectedAssignment.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed At</span>
                  <span className="text-gray-900">{formatShortDate(selectedAssignment.completedAt)}</span>
                </div>
              )}
              {selectedAssignment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-500 mb-1">Your Notes</p>
                    <p className="text-gray-700">{selectedAssignment.notes}</p>
                  </div>
                </>
              )}
              {selectedAssignment.parentNotes && (
                <div>
                  <p className="text-gray-500 mb-1">Parent Notes</p>
                  <p className="text-gray-700">{selectedAssignment.parentNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedAssignment(null)}>Close</Button>
            {selectedAssignment?.worksheetId && (
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = `/${selectedAssignment!.worksheetId}`;
                }}
              >
                View Worksheet
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Parent View ──

function ParentReceivedAssignments() {
  const [statusFilter, setStatusFilter] = useState<WorksheetAssignmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<WorksheetAssignment | null>(null);
  const [completionForm, setCompletionForm] = useState({
    timeSpentMinutes: '',
    difficultyRating: '3',
    engagementRating: '3',
    helpLevel: 'MINIMAL' as 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT',
    completionQuality: 'JUST_RIGHT' as 'TOO_EASY' | 'JUST_RIGHT' | 'CHALLENGING' | 'TOO_HARD',
    parentNotes: '',
  });

  const filters: AssignmentFilters = {
    page,
    limit: 10,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  };
  const { data, isLoading } = useReceivedAssignments(filters);
  const updateMutation = useUpdateAssignment();
  const completionMutation = useRecordCompletion();

  function handleStatusUpdate(assignment: WorksheetAssignment, newStatus: WorksheetAssignmentStatus) {
    updateMutation.mutate({ assignmentId: assignment.id, data: { status: newStatus } });
  }

  function openCompletionDialog(assignment: WorksheetAssignment) {
    setActiveAssignment(assignment);
    setCompletionForm({
      timeSpentMinutes: '',
      difficultyRating: '3',
      engagementRating: '3',
      helpLevel: 'MINIMAL',
      completionQuality: 'JUST_RIGHT',
      parentNotes: '',
    });
    setCompletionOpen(true);
  }

  function handleComplete() {
    if (!activeAssignment) return;
    completionMutation.mutate(
      {
        worksheetId: activeAssignment.worksheetId,
        data: {
          childId: activeAssignment.childId,
          assignmentId: activeAssignment.id,
          timeSpentMinutes: completionForm.timeSpentMinutes ? parseInt(completionForm.timeSpentMinutes, 10) : undefined,
          difficultyRating: parseInt(completionForm.difficultyRating, 10),
          engagementRating: parseInt(completionForm.engagementRating, 10),
          helpLevel: completionForm.helpLevel,
          completionQuality: completionForm.completionQuality,
          parentNotes: completionForm.parentNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setCompletionOpen(false);
          setActiveAssignment(null);
          updateMutation.mutate({ assignmentId: activeAssignment.id, data: { status: 'COMPLETED' } });
        },
      },
    );
  }

  function getAvailableActions(assignment: WorksheetAssignment) {
    const actions: Array<{ label: string; status?: WorksheetAssignmentStatus; action?: () => void }> = [];
    switch (assignment.status) {
      case 'ASSIGNED':
        actions.push({ label: 'Mark as Viewed', status: 'VIEWED' });
        break;
      case 'VIEWED':
        actions.push({ label: 'Start', status: 'IN_PROGRESS' });
        break;
      case 'IN_PROGRESS':
        actions.push({ label: 'Complete', action: () => openCompletionDialog(assignment) });
        break;
    }
    return actions;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Homework</h1>
          <p className="text-gray-500 text-sm mt-1">Worksheets assigned to you by therapists</p>
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(val) => { setStatusFilter(val as WorksheetAssignmentStatus | 'ALL'); setPage(1); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.data?.length ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">No homework assigned</h3>
          <p className="text-gray-500 text-sm mt-1">You do not have any worksheet assignments yet.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((assignment) => {
              const actions = getAvailableActions(assignment);
              return (
                <Card key={assignment.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/${assignment.worksheetId}`}
                        className="font-medium text-gray-900 hover:text-teal-600 transition-colors truncate block"
                      >
                        {assignment.worksheet?.title || 'Untitled Worksheet'}
                      </a>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                        <span>From: {assignment.assignedBy?.name || 'Unknown'}</span>
                        <span>Child: {assignment.child?.nickname || assignment.child?.firstName || 'N/A'}</span>
                        {assignment.dueDate && (() => {
                          const ds = getDueDateStyle(assignment.dueDate, assignment.status);
                          return <span className={ds.className}>{ds.label}</span>;
                        })()}
                      </div>
                      {assignment.notes && (
                        <p className="text-sm text-gray-500 mt-1 italic">&quot;{assignment.notes}&quot;</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        color={assignmentStatusColors[assignment.status] as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}
                      >
                        {assignmentStatusLabels[assignment.status]}
                      </Badge>
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className={
                            action.label === 'Start'
                              ? 'bg-purple-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50'
                              : 'border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                          }
                          onClick={() => {
                            if (action.action) {
                              action.action();
                            } else if (action.status) {
                              handleStatusUpdate(assignment, action.status);
                            }
                          }}
                          disabled={updateMutation.isPending}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 py-2">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Completion Dialog */}
      <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Worksheet</DialogTitle>
            <DialogDescription>
              Record completion details for &quot;{activeAssignment?.worksheet?.title || 'Worksheet'}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Time Spent (minutes)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g., 20"
                value={completionForm.timeSpentMinutes}
                onChange={(e) => setCompletionForm((f) => ({ ...f, timeSpentMinutes: e.target.value }))}
              />
            </div>
            <div>
              <Label>Difficulty (1 = very easy, 5 = very hard)</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCompletionForm((f) => ({ ...f, difficultyRating: String(n) }))}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                      completionForm.difficultyRating === String(n)
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Engagement (1 = not engaged, 5 = very engaged)</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCompletionForm((f) => ({ ...f, engagementRating: String(n) }))}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                      completionForm.engagementRating === String(n)
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Help Level</Label>
              <Select
                value={completionForm.helpLevel}
                onValueChange={(val) => setCompletionForm((f) => ({ ...f, helpLevel: val as typeof f.helpLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="MINIMAL">Minimal</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SIGNIFICANT">Significant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion Quality</Label>
              <Select
                value={completionForm.completionQuality}
                onValueChange={(val) => setCompletionForm((f) => ({ ...f, completionQuality: val as typeof f.completionQuality }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOO_EASY">Too Easy</SelectItem>
                  <SelectItem value="JUST_RIGHT">Just Right</SelectItem>
                  <SelectItem value="CHALLENGING">Challenging</SelectItem>
                  <SelectItem value="TOO_HARD">Too Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="How did your child do? Any observations..."
                value={completionForm.parentNotes}
                onChange={(e) => setCompletionForm((f) => ({ ...f, parentNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompletionOpen(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completionMutation.isPending}>
              {completionMutation.isPending ? 'Submitting...' : 'Record Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
