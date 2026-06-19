'use client';

import { useState } from 'react';
import { useIncidents, useCreateIncident, useCloseIncident } from '@/hooks/use-clinic-ops';
import type { IncidentCategory, IncidentUrgency } from '@/lib/api/clinic-ops';
import { formatDate } from '@/lib/utils';
import {
  Button, Card, Badge, Label, Textarea, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@upllyft/ui';
import { Plus, AlertTriangle, ShieldAlert } from 'lucide-react';

const URGENCY_COLOR: Record<IncidentUrgency, string> = { EMERGENCY: 'red', URGENT: 'yellow', ROUTINE: 'gray' };
const STATUS_COLOR: Record<string, string> = { OPEN: 'red', IN_REVIEW: 'yellow', ACTION_TAKEN: 'blue', CLOSED: 'green' };
const CATEGORIES: Record<IncidentCategory, string> = {
  MEDICAL_INSTABILITY: 'Medical instability', MENTAL_HEALTH_RISK: 'Mental-health risk', SAFEGUARDING: 'Safeguarding',
  SEVERE_BEHAVIOUR: 'Severe behaviour', ABUSE_NEGLECT: 'Abuse / neglect', OUT_OF_SCOPE: 'Out of scope', OTHER: 'Other',
};
const URGENCIES: IncidentUrgency[] = ['EMERGENCY', 'URGENT', 'ROUTINE'];

export function IncidentsTab({ caseId }: { caseId: string }) {
  const { data: incidents, isLoading } = useIncidents(caseId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Incidents &amp; Escalation</h2>
          <p className="text-sm text-gray-500">Safeguarding, medical and behavioural escalations tracked to closure.</p>
        </div>
        <RaiseIncidentDialog caseId={caseId} />
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !incidents?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500"><ShieldAlert className="h-8 w-8 text-gray-300 mx-auto mb-2" />No incidents on this case.</Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((i) => (
            <Card key={i.id} className={`p-4 ${i.urgency === 'EMERGENCY' && i.status !== 'CLOSED' ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={URGENCY_COLOR[i.urgency] as any}>{i.urgency}</Badge>
                    <Badge color={(STATUS_COLOR[i.status] || 'gray') as any}>{i.status}</Badge>
                    <Badge color={'gray' as any}>{CATEGORIES[i.category]}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{i.description}</p>
                  {i.actionPlan && <p className="text-sm text-gray-500 mt-1">Action: {i.actionPlan}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(i.createdAt)}</p>
                </div>
                {i.status !== 'CLOSED' && <CloseIncidentDialog caseId={caseId} id={i.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RaiseIncidentDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ category: 'OTHER', urgency: 'ROUTINE', description: '' });
  const create = useCreateIncident(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="primary" className="bg-red-600 hover:bg-red-700"><AlertTriangle className="h-4 w-4 mr-1" /> Raise incident</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORIES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button disabled={create.isPending || !form.description.trim()} onClick={async () => { await create.mutateAsync({ ...form, raisedFromModule: 'case' }); setOpen(false); setForm({ category: 'OTHER', urgency: 'ROUTINE', description: '' }); }}>Raise</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseIncidentDialog({ caseId, id }: { caseId: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [actionPlan, setActionPlan] = useState('');
  const close = useCloseIncident(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Close</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Close incident</DialogTitle></DialogHeader>
        <div><Label>Action plan / resolution</Label><Textarea rows={2} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} /></div>
        <DialogFooter><Button disabled={close.isPending} onClick={async () => { await close.mutateAsync({ id, actionPlan: actionPlan || undefined }); setOpen(false); }}>Close incident</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
