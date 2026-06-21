'use client';

import { useState } from 'react';
import { useTriage, useCreateTriage, useDecideTriage } from '@/hooks/use-clinic-ops';
import type { RiskLevel, TriageDecision } from '@/lib/api/clinic-ops';
import { formatDate } from '@/lib/utils';
import {
  Button, Card, Badge, Label, Textarea, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@upllyft/ui';
import { Plus, Stethoscope } from 'lucide-react';

const RISK_COLOR: Record<RiskLevel, string> = { NONE: 'gray', LOW: 'blue', MODERATE: 'yellow', HIGH: 'red' };
const DECISIONS: Record<TriageDecision, string> = {
  PROCEED: 'Proceed', REQUEST_MORE_INFO: 'Request more info', URGENT_REFERRAL: 'Urgent referral',
  ALTERNATE_SERVICE: 'Alternate service', OUT_OF_SCOPE: 'Out of scope',
};
const RISKS: RiskLevel[] = ['NONE', 'LOW', 'MODERATE', 'HIGH'];

export function TriageTab({ caseId }: { caseId: string }) {
  const { data: reviews, isLoading } = useTriage(caseId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Triage</h2>
          <p className="text-sm text-gray-500">Clinical-lead review of risk and pathway.</p>
        </div>
        <NewTriageDialog caseId={caseId} />
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !reviews?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500"><Stethoscope className="h-8 w-8 text-gray-300 mx-auto mb-2" />No triage reviews yet.</Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={(t.status === 'DECIDED' ? 'green' : 'yellow') as any}>{t.status}</Badge>
                    <Badge color={RISK_COLOR[t.riskLevel] as any}>Risk: {t.riskLevel}</Badge>
                    {t.decision && <Badge color={'blue' as any}>{DECISIONS[t.decision]}</Badge>}
                  </div>
                  {t.aiSummary && <p className="text-sm text-gray-600 mt-2">{t.aiSummary}</p>}
                  {t.notes && <p className="text-sm text-gray-500 mt-1">{t.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(t.createdAt)}</p>
                </div>
                {t.status !== 'DECIDED' && <DecideTriageDialog caseId={caseId} id={t.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTriageDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ riskLevel: 'NONE' });
  const create = useCreateTriage(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New triage</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New triage review</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Risk level</Label>
            <Select value={form.riskLevel} onValueChange={(v) => setForm({ ...form, riskLevel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Summary / notes</Label><Textarea rows={3} value={form.aiSummary || ''} onChange={(e) => setForm({ ...form, aiSummary: e.target.value })} /></div>
        </div>
        <DialogFooter><Button disabled={create.isPending} onClick={async () => { await create.mutateAsync(form); setOpen(false); setForm({ riskLevel: 'NONE' }); }}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideTriageDialog({ caseId, id }: { caseId: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ decision: 'PROCEED' });
  const decide = useDecideTriage(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Decide</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Triage decision</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Decision</Label>
            <Select value={form.decision} onValueChange={(v) => setForm({ ...form, decision: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DECISIONS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button disabled={decide.isPending} onClick={async () => { await decide.mutateAsync({ id, data: form }); setOpen(false); }}>Record decision</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
