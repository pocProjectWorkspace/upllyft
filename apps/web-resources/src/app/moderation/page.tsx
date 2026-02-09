'use client';

import { useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import {
  Button,
  Card,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
} from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useModerationQueue,
  useModerationStats,
  useResolveFlag,
} from '@/hooks/use-worksheets';
import type { WorksheetFlagReason, WorksheetFlagStatus, FlagFilters } from '@/lib/api/worksheets';
import {
  flagReasonLabels,
  flagStatusLabels,
  flagStatusColors,
  formatRelativeDate,
} from '@/lib/utils';

const FLAG_REASONS: WorksheetFlagReason[] = ['INAPPROPRIATE', 'INACCURATE', 'HARMFUL', 'SPAM', 'OTHER'];
const FLAG_STATUSES: WorksheetFlagStatus[] = ['PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED'];
const RESOLVE_STATUSES: WorksheetFlagStatus[] = ['REVIEWED', 'DISMISSED', 'ACTIONED'];

export default function ModerationPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Resolve dialog state
  const [resolveFlagId, setResolveFlagId] = useState<string | null>(null);
  const [resolveStatus, setResolveStatus] = useState<WorksheetFlagStatus>('REVIEWED');
  const [resolveNotes, setResolveNotes] = useState('');

  const filters: FlagFilters = {
    page,
    limit: 20,
    ...(statusFilter !== 'all' && { status: statusFilter as WorksheetFlagStatus }),
    ...(reasonFilter !== 'all' && { reason: reasonFilter as WorksheetFlagReason }),
  };

  const { data: stats, isLoading: statsLoading } = useModerationStats();
  const { data: queue, isLoading: queueLoading } = useModerationQueue(filters);
  const resolveMutation = useResolveFlag();

  const flags = queue?.data ?? [];
  const totalPages = queue?.totalPages ?? 1;

  if (!isAdmin) {
    return (
      <ResourcesShell>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">
            You need Admin or Moderator privileges to access the moderation dashboard.
          </p>
        </div>
      </ResourcesShell>
    );
  }

  function handleResolve() {
    if (!resolveFlagId) return;
    resolveMutation.mutate(
      { flagId: resolveFlagId, data: { status: resolveStatus, resolution: resolveNotes || undefined } },
      {
        onSuccess: () => {
          setResolveFlagId(null);
          setResolveStatus('REVIEWED');
          setResolveNotes('');
        },
      },
    );
  }

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderation Dashboard</h1>
          <p className="text-gray-500 mt-1">Review flagged worksheets and manage community content.</p>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.reviewed}</p>
              <p className="text-xs text-gray-500 mt-1">Reviewed</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-500">{stats.dismissed}</p>
              <p className="text-xs text-gray-500 mt-1">Dismissed</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.actioned}</p>
              <p className="text-xs text-gray-500 mt-1">Actioned</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.flaggedWorksheets}</p>
              <p className="text-xs text-gray-500 mt-1">Flagged Worksheets</p>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {FLAG_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{flagStatusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {FLAG_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{flagReasonLabels[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Queue */}
        {queueLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flags.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-gray-900">No flags found</h3>
            <p className="text-gray-500 mt-1">No flagged content matches your current filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <Card key={flag.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        {flag.worksheet?.title ?? 'Unknown Worksheet'}
                      </h3>
                      <Badge color={(flagStatusColors[flag.status] ?? 'gray') as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                        {flagStatusLabels[flag.status]}
                      </Badge>
                      <Badge color="red">{flagReasonLabels[flag.reason]}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Flagged by {flag.flaggedBy?.name ?? 'Unknown'} {' '}
                      <span className="text-gray-400">{formatRelativeDate(flag.createdAt)}</span>
                    </p>
                    {flag.details && (
                      <p className="text-sm text-gray-500 bg-gray-50 rounded p-2">{flag.details}</p>
                    )}
                    {flag.resolution && (
                      <p className="text-sm text-gray-500 italic">
                        Resolution: {flag.resolution}
                        {flag.resolvedBy && <span> (by {flag.resolvedBy.name})</span>}
                      </p>
                    )}
                  </div>

                  {/* Resolve button */}
                  {flag.status === 'PENDING' && (
                    <Dialog
                      open={resolveFlagId === flag.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setResolveFlagId(flag.id);
                        } else {
                          setResolveFlagId(null);
                          setResolveNotes('');
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Resolve</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve Flag</DialogTitle>
                          <DialogDescription>
                            Choose a resolution for this flagged worksheet.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Resolution Status
                            </label>
                            <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as WorksheetFlagStatus)}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESOLVE_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{flagStatusLabels[s]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Resolution Notes
                            </label>
                            <Textarea
                              placeholder="Add notes about the resolution..."
                              value={resolveNotes}
                              onChange={(e) => setResolveNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setResolveFlagId(null)}>Cancel</Button>
                          <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
                            {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
