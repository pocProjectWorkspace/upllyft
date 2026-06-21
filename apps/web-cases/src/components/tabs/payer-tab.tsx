'use client';

import { useState } from 'react';
import { useCase } from '@/hooks/use-cases';
import {
  useInsurancePolicies,
  useCreateInsurancePolicy,
  usePreAuths,
  useCreatePreAuth,
  useDecidePreAuth,
  useRenewPreAuth,
} from '@/hooks/use-payer';
import type { PayerType, PreAuthStatus, InsurancePolicy } from '@/lib/api/payer';
import { formatDate } from '@/lib/utils';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@upllyft/ui';
import { Plus, ShieldCheck, CheckCircle2, XCircle, RefreshCw, CreditCard } from 'lucide-react';

const PAYER_LABELS: Record<PayerType, string> = {
  SELF_PAY: 'Self-pay',
  INSURANCE: 'Insurance',
  EMPLOYER: 'Employer',
  SCHOOL_SPONSOR: 'School sponsor',
  NGO_SPONSOR: 'NGO sponsor',
  OTHER_THIRD_PARTY: 'Other third party',
};

const PREAUTH_COLOR: Record<PreAuthStatus, string> = {
  NOT_REQUIRED: 'blue',
  PENDING: 'yellow',
  APPROVED: 'green',
  DENIED: 'red',
  EXPIRED: 'gray',
};

export function PayerTab({ caseId }: { caseId: string }) {
  const { data: caseData } = useCase(caseId);
  const childId = (caseData as any)?.child?.id as string | undefined;

  const { data: policies, isLoading: loadingPolicies } = useInsurancePolicies(childId);
  const { data: preAuths, isLoading: loadingPreAuths } = usePreAuths(caseId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Payer &amp; Pre-authorisation</h2>
        <p className="text-sm text-gray-500">Insurance policies and pre-authorisation lifecycle for this patient.</p>
      </div>

      {/* Insurance policies */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Insurance &amp; Payer</h3>
          </div>
          {childId && <AddPolicyDialog childId={childId} />}
        </div>

        {loadingPolicies ? (
          <Skeleton className="h-20 w-full" />
        ) : !policies?.length ? (
          <p className="text-sm text-gray-500 py-4 text-center">No payer profile yet. Add an insurance policy or sponsor.</p>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => (
              <div key={p.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{p.insurerName || p.sponsorName || PAYER_LABELS[p.payerType]}</span>
                    <Badge color={(p.isActive ? 'green' : 'gray') as any}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 space-x-3">
                    <span>{PAYER_LABELS[p.payerType]}</span>
                    {p.policyNumber && <span>Policy {p.policyNumber}</span>}
                    {p.memberId && <span>Member {p.memberId}</span>}
                    {p.coPayPercent != null && <span>Co-pay {p.coPayPercent}%</span>}
                  </div>
                  {(p.validFrom || p.validUntil) && (
                    <div className="text-xs text-gray-400 mt-1">
                      Valid {p.validFrom ? formatDate(p.validFrom) : '—'} → {p.validUntil ? formatDate(p.validUntil) : '—'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pre-authorisations */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Pre-authorisations</h3>
          </div>
          {!!policies?.length && <RequestPreAuthDialog caseId={caseId} childId={childId} policies={policies} />}
        </div>

        {loadingPreAuths ? (
          <Skeleton className="h-20 w-full" />
        ) : !preAuths?.length ? (
          <p className="text-sm text-gray-500 py-4 text-center">No pre-authorisations on this case.</p>
        ) : (
          <div className="space-y-3">
            {preAuths.map((a) => {
              const exhausted = a.approvedSessions != null && a.usedSessions >= a.approvedSessions;
              return (
                <div key={a.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{a.preAuthNumber || 'Pending number'}</span>
                      <Badge color={PREAUTH_COLOR[a.status] as any}>{a.status}</Badge>
                      {exhausted && <Badge color={'red' as any}>Sessions exhausted</Badge>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 space-x-3">
                      {a.serviceCode && <span>{a.serviceCode}</span>}
                      <span>
                        Sessions {a.usedSessions}
                        {a.approvedSessions != null ? ` / ${a.approvedSessions}` : ''}
                      </span>
                      {a.validUntil && <span>Valid to {formatDate(a.validUntil)}</span>}
                    </div>
                    {a.denialReason && <p className="text-xs text-red-500 mt-1">Denied: {a.denialReason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === 'PENDING' && <DecidePreAuthButtons caseId={caseId} id={a.id} />}
                    {a.status === 'APPROVED' && <RenewButton caseId={caseId} id={a.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Add policy ──
function AddPolicyDialog({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<InsurancePolicy>>({ payerType: 'INSURANCE' });
  const create = useCreateInsurancePolicy(childId);

  const submit = async () => {
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ payerType: 'INSURANCE' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add policy</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add insurance / payer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Payer type</Label>
            <Select value={form.payerType} onValueChange={(v) => setForm({ ...form, payerType: v as PayerType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYER_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Insurer name</Label><Input value={form.insurerName || ''} onChange={(e) => setForm({ ...form, insurerName: e.target.value })} /></div>
          <div><Label>Sponsor name (employer/school/NGO)</Label><Input value={form.sponsorName || ''} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Policy number</Label><Input value={form.policyNumber || ''} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} /></div>
            <div><Label>Member ID</Label><Input value={form.memberId || ''} onChange={(e) => setForm({ ...form, memberId: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valid until</Label><Input type="date" value={(form.validUntil as string) || ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
            <div><Label>Co-pay %</Label><Input type="number" value={form.coPayPercent ?? ''} onChange={(e) => setForm({ ...form, coPayPercent: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>Save policy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Request pre-auth ──
function RequestPreAuthDialog({ caseId, childId, policies }: { caseId: string; childId?: string; policies: InsurancePolicy[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ policyId: policies[0]?.id });
  const create = useCreatePreAuth(caseId, childId);

  const submit = async () => {
    await create.mutateAsync({ ...form, caseId, approvedSessions: form.approvedSessions ? Number(form.approvedSessions) : undefined });
    setOpen(false);
    setForm({ policyId: policies[0]?.id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Request pre-auth</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request pre-authorisation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Policy</Label>
            <Select value={form.policyId} onValueChange={(v) => setForm({ ...form, policyId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.insurerName || p.sponsorName || p.payerType}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Service code</Label><Input value={form.serviceCode || ''} onChange={(e) => setForm({ ...form, serviceCode: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sessions requested</Label><Input type="number" value={form.approvedSessions ?? ''} onChange={(e) => setForm({ ...form, approvedSessions: e.target.value })} /></div>
            <div><Label>Valid until</Label><Input type="date" value={form.validUntil || ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending || !form.policyId}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approve / Deny ──
function DecidePreAuthButtons({ caseId, id }: { caseId: string; id: string }) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [approve, setApprove] = useState<any>({});
  const [denyReason, setDenyReason] = useState('');
  const decide = useDecidePreAuth(caseId);

  return (
    <>
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline"><CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Approve</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve pre-authorisation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pre-auth number</Label><Input value={approve.preAuthNumber || ''} onChange={(e) => setApprove({ ...approve, preAuthNumber: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Approved sessions</Label><Input type="number" value={approve.approvedSessions ?? ''} onChange={(e) => setApprove({ ...approve, approvedSessions: e.target.value })} /></div>
              <div><Label>Valid until</Label><Input type="date" value={approve.validUntil || ''} onChange={(e) => setApprove({ ...approve, validUntil: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => { await decide.mutateAsync({ id, data: { status: 'APPROVED', ...approve, approvedSessions: approve.approvedSessions ? Number(approve.approvedSessions) : undefined } }); setApproveOpen(false); }}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline"><XCircle className="h-4 w-4 mr-1 text-red-600" /> Deny</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Deny pre-authorisation</DialogTitle></DialogHeader>
          <div><Label>Reason</Label><Input value={denyReason} onChange={(e) => setDenyReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={async () => { await decide.mutateAsync({ id, data: { status: 'DENIED', denialReason: denyReason } }); setDenyOpen(false); }}>Confirm denial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Renew ──
function RenewButton({ caseId, id }: { caseId: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const renew = useRenewPreAuth(caseId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-1" /> Renew</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Renew pre-authorisation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Approved sessions</Label><Input type="number" value={form.approvedSessions ?? ''} onChange={(e) => setForm({ ...form, approvedSessions: e.target.value })} /></div>
            <div><Label>Valid until</Label><Input type="date" value={form.validUntil || ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => { await renew.mutateAsync({ id, data: { ...form, approvedSessions: form.approvedSessions ? Number(form.approvedSessions) : undefined } }); setOpen(false); }}>Create renewal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
