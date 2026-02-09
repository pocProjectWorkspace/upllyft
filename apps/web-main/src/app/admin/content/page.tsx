'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  StatCard,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Alert,
  AlertDescription,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import { useFlaggedContent, useModerateContent } from '@/hooks/use-admin';
import type { FlaggedContent } from '@/lib/api/admin';

const severityColor: Record<string, 'gray' | 'yellow' | 'red' | 'purple'> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
  critical: 'purple',
};

const typeIcon: Record<string, string> = {
  post: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  comment: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

export default function ContentModerationPage() {
  const [filter, setFilter] = useState<string | undefined>();
  const [reviewing, setReviewing] = useState<FlaggedContent | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const { data: items, isLoading } = useFlaggedContent(filter);
  const moderate = useModerateContent();

  const pendingCount = items?.filter((i) => i.status === 'pending').length ?? 0;
  const autoFlagged = items?.filter((i) => i.flaggedBy === 'system').length ?? 0;
  const userReports = items?.filter((i) => i.flaggedBy === 'user').length ?? 0;
  const criticalCount = items?.filter((i) => i.severity === 'critical').length ?? 0;

  const handleModerate = (action: 'approve' | 'remove') => {
    if (!reviewing) return;
    moderate.mutate(
      { contentId: reviewing.id, action, notes },
      {
        onSuccess: () => {
          toast({
            title: action === 'approve' ? 'Content approved' : 'Content removed',
            description: `Item has been ${action === 'approve' ? 'approved' : 'removed'}`,
          });
          setReviewing(null);
          setNotes('');
        },
        onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-gray-500 mt-1">Review and moderate flagged content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          value={pendingCount}
          label="Pending Review"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          value={autoFlagged}
          label="Auto-Flagged"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          value={userReports}
          label="User Reports"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          value={criticalCount}
          label="Critical"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[undefined, 'pending', 'reviewing', 'resolved'].map((f) => (
          <Button
            key={f ?? 'all'}
            variant={filter === f ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
          </Button>
        ))}
      </div>

      {/* Moderation queue */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !items?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  No flagged content
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcon[item.type] ?? typeIcon.post} />
                      </svg>
                      <span className="text-sm capitalize">{item.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-700 truncate max-w-[200px]">{item.preview}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{item.author}</TableCell>
                  <TableCell>
                    <Badge color="gray">{item.reason}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={severityColor[item.severity] ?? 'gray'}>
                      {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(item.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewing(item);
                        setNotes('');
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
      </Card>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={() => setReviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Flagged Content</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
                {reviewing.fullContent}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Author:</span>{' '}
                  <span className="font-medium">{reviewing.author}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium capitalize">{reviewing.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Reason:</span>{' '}
                  <span className="font-medium">{reviewing.reason}</span>
                </div>
                <div>
                  <span className="text-gray-500">Severity:</span>{' '}
                  <Badge color={severityColor[reviewing.severity] ?? 'gray'}>
                    {reviewing.severity}
                  </Badge>
                </div>
              </div>
              {reviewing.aiAnalysis && (
                <Alert>
                  <AlertDescription>
                    <strong>AI Analysis:</strong> {reviewing.aiAnalysis}
                  </AlertDescription>
                </Alert>
              )}
              <Textarea
                placeholder="Moderation notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={() => handleModerate('remove')}
              disabled={moderate.isPending}
            >
              Remove Content
            </Button>
            <Button
              onClick={() => handleModerate('approve')}
              disabled={moderate.isPending}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
