'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  StatCard,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import { useVerificationQueue, useVerificationStats, useVerifyUser } from '@/hooks/use-admin';
import type { PendingVerification } from '@/lib/api/admin';

export default function VerificationPage() {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<PendingVerification | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useVerificationStats();
  const { data: queue, isLoading: queueLoading } = useVerificationQueue({
    status: statusFilter === 'All' ? undefined : statusFilter,
    page,
  });
  const verify = useVerifyUser();

  const filtered = (queue?.data ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleVerify = (status: 'VERIFIED' | 'REJECTED') => {
    if (!reviewing) return;
    verify.mutate(
      { userId: reviewing.id, status, notes: reviewNotes },
      {
        onSuccess: () => {
          toast({
            title: status === 'VERIFIED' ? 'User verified' : 'User rejected',
            description: `${reviewing.name} has been ${status.toLowerCase()}`,
          });
          setReviewing(null);
          setReviewNotes('');
        },
        onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-gray-500 mt-1">Review and verify therapist/educator credentials</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-6 w-12 mt-2" />
              <Skeleton className="h-4 w-16 mt-1" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats?.pending ?? 0}
              label="Pending"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats?.verified ?? 0}
              label="Verified"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats?.rejected ?? 0}
              label="Rejected"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              value={stats?.total ?? 0}
              label="Total"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
              value={`${stats?.verificationRate?.toFixed(0) ?? 0}%`}
              label="Success Rate"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Queue table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No pending verifications
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge color="teal">{user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.verificationDocs?.length ?? 0} docs
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        user.verificationStatus === 'APPROVED'
                          ? 'green'
                          : user.verificationStatus === 'REJECTED'
                            ? 'red'
                            : 'yellow'
                      }
                    >
                      {user.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewing(user);
                        setReviewNotes('');
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {queue && queue.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {queue.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= queue.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={() => setReviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{' '}
                  <span className="font-medium">{reviewing.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{' '}
                  <span className="font-medium">{reviewing.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>{' '}
                  <Badge color="teal">{reviewing.role}</Badge>
                </div>
                {reviewing.organization && (
                  <div>
                    <span className="text-gray-500">Organization:</span>{' '}
                    <span className="font-medium">{reviewing.organization}</span>
                  </div>
                )}
                {reviewing.licenseNumber && (
                  <div>
                    <span className="text-gray-500">License #:</span>{' '}
                    <span className="font-medium">{reviewing.licenseNumber}</span>
                  </div>
                )}
                {reviewing.yearsOfExperience != null && (
                  <div>
                    <span className="text-gray-500">Experience:</span>{' '}
                    <span className="font-medium">{reviewing.yearsOfExperience} years</span>
                  </div>
                )}
              </div>

              {reviewing.verificationDocs?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Documents</p>
                  <div className="space-y-2">
                    {reviewing.verificationDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm">{doc.type}</span>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Review notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={() => handleVerify('REJECTED')}
              disabled={verify.isPending}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleVerify('VERIFIED')}
              disabled={verify.isPending}
            >
              {verify.isPending ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
