'use client';

import { useState } from 'react';
import { useReviews, useCreateReview, useCompleteReview } from '@/hooks/use-clinic-ops';
import type { ReviewTriggerType } from '@/lib/api/clinic-ops';
import { formatDate } from '@/lib/utils';
import {
  Button, Card, Badge, Label, Textarea, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@upllyft/ui';
import { Plus, ClipboardCheck } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = { DUE: 'yellow', IN_PROGRESS: 'blue', COMPLETED: 'green' };
const TRIGGERS: Record<ReviewTriggerType, string> = {
  PLAN_DATE: 'Plan date', SESSION_COUNT: 'Session count', AUTH_EXPIRY: 'Authorisation expiry',
  GOAL_PROGRESS: 'Goal progress', CLINICAL_FLAG: 'Clinical flag', MANUAL: 'Manual',
};

export function ReviewsTab({ caseId }: { caseId: string }) {
  const { data: reviews, isLoading } = useReviews(caseId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-500">Care reviews due from plan dates, authorisation expiry, goals and clinical flags.</p>
        </div>
        <NewReviewDialog caseId={caseId} />
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !reviews?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500"><ClipboardCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />No reviews due.</Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={(STATUS_COLOR[r.status] || 'gray') as any}>{r.status}</Badge>
                    <Badge color={'gray' as any}>{TRIGGERS[r.triggerType]}</Badge>
                  </div>
                  {r.dueAt && <p className="text-sm text-gray-500 mt-1">Due {formatDate(r.dueAt)}</p>}
                  {r.outcome && <p className="text-sm text-gray-600 mt-1">Outcome: {r.outcome}</p>}
                </div>
                {r.status !== 'COMPLETED' && <CompleteReviewDialog caseId={caseId} id={r.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewReviewDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<ReviewTriggerType>('MANUAL');
  const create = useCreateReview(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New review</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create review</DialogTitle></DialogHeader>
        <div><Label>Trigger</Label>
          <Select value={triggerType} onValueChange={(v) => setTriggerType(v as ReviewTriggerType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TRIGGERS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter><Button disabled={create.isPending} onClick={async () => { await create.mutateAsync({ triggerType }); setOpen(false); }}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteReviewDialog({ caseId, id }: { caseId: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const complete = useCompleteReview(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Complete</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete review</DialogTitle></DialogHeader>
        <div><Label>Outcome (continue / revise / intensify / reduce / pause / discharge)</Label><Textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} /></div>
        <DialogFooter><Button disabled={complete.isPending || !outcome.trim()} onClick={async () => { await complete.mutateAsync({ id, outcome }); setOpen(false); }}>Mark completed</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
