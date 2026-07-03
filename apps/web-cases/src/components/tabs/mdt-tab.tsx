'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMdt, useCreateMdt, useCompleteMdt } from '@/hooks/use-clinic-ops';
import { formatDate } from '@/lib/utils';
import {
  Button, Card, Badge, Input, Label, Textarea, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@upllyft/ui';
import { Plus, Users2, CheckCircle2, FileText } from 'lucide-react';

const MDT_COLOR: Record<string, string> = { SCHEDULED: 'yellow', COMPLETED: 'green', CANCELLED: 'gray' };

export function MdtTab({ caseId }: { caseId: string }) {
  const { data: reviews, isLoading } = useMdt(caseId);
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">MDT Reviews</h2>
          <p className="text-sm text-gray-500">Multidisciplinary team reviews with attendance &amp; approval logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/${caseId}/assessments/new?discipline=MULTIDISCIPLINARY&activity=MDT_REVIEW`,
              )
            }
          >
            <FileText className="h-4 w-4 mr-1" /> Structured MDT report
          </Button>
          <ScheduleMdtDialog caseId={caseId} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !reviews?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500"><Users2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />No MDT reviews yet.</Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{m.scheduledAt ? formatDate(m.scheduledAt) : 'Unscheduled'}</span>
                    <Badge color={(MDT_COLOR[m.status] || 'gray') as any}>{m.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{(m.attendees?.length || 0)} attendee(s){m.summary ? ` · ${m.summary}` : ''}</p>
                </div>
                {m.status !== 'COMPLETED' && <CompleteMdtDialog caseId={caseId} id={m.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleMdtDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const create = useCreateMdt(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule MDT</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule MDT review</DialogTitle></DialogHeader>
        <div><Label>Date</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
        <DialogFooter><Button disabled={create.isPending} onClick={async () => { await create.mutateAsync({ scheduledAt: scheduledAt || undefined }); setOpen(false); }}>Schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteMdtDialog({ caseId, id }: { caseId: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const complete = useCompleteMdt(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Complete</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete MDT review</DialogTitle></DialogHeader>
        <div><Label>Consensus / decision summary</Label><Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
        <DialogFooter><Button disabled={complete.isPending || !summary.trim()} onClick={async () => { await complete.mutateAsync({ id, summary }); setOpen(false); }}>Mark completed</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
