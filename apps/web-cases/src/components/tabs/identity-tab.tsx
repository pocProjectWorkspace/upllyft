'use client';

import { useState } from 'react';
import { useCase } from '@/hooks/use-cases';
import {
  useIdentity,
  useCaptureIdentity,
  useVerifyIdentity,
  useGuardians,
  useCreateGuardian,
  useUpdateGuardian,
  useRemoveGuardian,
} from '@/hooks/use-clinic-intake';
import type {
  IdentityDocType,
  GuardianRelationship,
  GuardianAccessLevel,
  Guardian,
} from '@/lib/api/clinic-intake';
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
import { Plus, Fingerprint, ShieldCheck, Users, Pencil, Trash2, CheckCircle2 } from 'lucide-react';

const ID_TYPES: Record<IdentityDocType, string> = {
  EMIRATES_ID: 'Emirates ID',
  PASSPORT: 'Passport',
  BIRTH_CERTIFICATE: 'Birth certificate',
  OTHER: 'Other',
};
const RELATIONSHIPS: Record<GuardianRelationship, string> = {
  MOTHER: 'Mother',
  FATHER: 'Father',
  LEGAL_GUARDIAN: 'Legal guardian',
  GRANDPARENT: 'Grandparent',
  SIBLING: 'Sibling',
  OTHER: 'Other',
};
const ACCESS_LEVELS: Record<GuardianAccessLevel, string> = {
  FULL: 'Full',
  LIMITED: 'Limited',
  VIEW_ONLY: 'View only',
  NONE: 'None',
};

export function IdentityTab({ caseId }: { caseId: string }) {
  const { data: caseData } = useCase(caseId);
  const childId = (caseData as any)?.child?.id as string | undefined;
  const { data: identity, isLoading: loadingId } = useIdentity(childId);
  const { data: guardians, isLoading: loadingG } = useGuardians(childId);
  const verify = useVerifyIdentity(childId || '');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Identity &amp; Guardians</h2>
        <p className="text-sm text-gray-500">Patient identity (stored encrypted, shown masked) and legal guardians.</p>
      </div>

      {/* Identity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Identity</h3>
          </div>
          {childId && <CaptureIdentityDialog childId={childId} />}
        </div>

        {loadingId ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Document type" value={identity?.identityType ? ID_TYPES[identity.identityType] : '—'} />
            <Row label="Emirates ID" value={identity?.emiratesIdMasked || '—'} />
            <Row label="Emirates ID expiry" value={identity?.emiratesIdExpiry ? formatDate(identity.emiratesIdExpiry) : '—'} />
            <Row label="Passport" value={identity?.passportMasked || '—'} />
            <div className="flex items-center justify-between pt-2">
              <span className="text-gray-500">Verification</span>
              {identity?.identityVerified ? (
                <Badge color={'green' as any}>Verified{identity.identityVerifiedAt ? ` · ${formatDate(identity.identityVerifiedAt)}` : ''}</Badge>
              ) : (
                <Button size="sm" variant="outline" disabled={!childId || verify.isPending} onClick={() => verify.mutate()}>
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Mark verified
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Guardians */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Guardians</h3>
          </div>
          {childId && <GuardianDialog childId={childId} />}
        </div>

        {loadingG ? (
          <Skeleton className="h-20 w-full" />
        ) : !guardians?.length ? (
          <p className="text-sm text-gray-500 py-4 text-center">No guardians recorded.</p>
        ) : (
          <div className="space-y-3">
            {guardians.map((g) => (
              <div key={g.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{g.fullName}</span>
                    <Badge color={'gray' as any}>{RELATIONSHIPS[g.relationship]}</Badge>
                    {g.hasAuthorityToConsent && <Badge color={'green' as any}><ShieldCheck className="h-3 w-3 mr-1 inline" />Consent authority</Badge>}
                    {g.isPrimaryContact && <Badge color={'blue' as any}>Primary</Badge>}
                    {g.isEmergencyContact && <Badge color={'yellow' as any}>Emergency</Badge>}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 space-x-3">
                    {g.phone && <span>{g.phone}</span>}
                    {g.email && <span>{g.email}</span>}
                    <span>Access: {ACCESS_LEVELS[g.accessLevel]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <GuardianDialog childId={childId!} existing={g} />
                  <RemoveGuardianButton childId={childId!} id={g.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function CaptureIdentityDialog({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ identityType: 'EMIRATES_ID' });
  const capture = useCaptureIdentity(childId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Capture identity</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Capture identity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Document type</Label>
            <Select value={form.identityType} onValueChange={(v) => setForm({ ...form, identityType: v as IdentityDocType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ID_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emirates ID</Label><Input value={form.emiratesId || ''} onChange={(e) => setForm({ ...form, emiratesId: e.target.value })} /></div>
            <div><Label>Emirates ID expiry</Label><Input type="date" value={form.emiratesIdExpiry || ''} onChange={(e) => setForm({ ...form, emiratesIdExpiry: e.target.value })} /></div>
          </div>
          <div><Label>Passport number</Label><Input value={form.passportNumber || ''} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} /></div>
          <p className="text-xs text-gray-400">Numbers are encrypted at rest and only ever displayed masked.</p>
        </div>
        <DialogFooter>
          <Button disabled={capture.isPending} onClick={async () => { await capture.mutateAsync(form); setOpen(false); setForm({ identityType: 'EMIRATES_ID' }); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuardianDialog({ childId, existing }: { childId: string; existing?: Guardian }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Guardian>>(
    existing || { relationship: 'MOTHER', accessLevel: 'VIEW_ONLY', hasAuthorityToConsent: false, isPrimaryContact: false, isEmergencyContact: false },
  );
  const create = useCreateGuardian(childId);
  const update = useUpdateGuardian(childId);

  const submit = async () => {
    if (existing) await update.mutateAsync({ id: existing.id, data: form });
    else await create.mutateAsync(form);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add guardian</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? 'Edit guardian' : 'Add guardian'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Relationship</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v as GuardianRelationship })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RELATIONSHIPS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access level</Label>
              <Select value={form.accessLevel} onValueChange={(v) => setForm({ ...form, accessLevel: v as GuardianAccessLevel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACCESS_LEVELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.hasAuthorityToConsent} onChange={(e) => setForm({ ...form, hasAuthorityToConsent: e.target.checked })} /> Has authority to consent</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isPrimaryContact} onChange={(e) => setForm({ ...form, isPrimaryContact: e.target.checked })} /> Primary contact</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isEmergencyContact} onChange={(e) => setForm({ ...form, isEmergencyContact: e.target.checked })} /> Emergency contact</label>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={create.isPending || update.isPending || !form.fullName} onClick={submit}>{existing ? 'Save' : 'Add guardian'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveGuardianButton({ childId, id }: { childId: string; id: string }) {
  const remove = useRemoveGuardian(childId);
  return (
    <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(id)}>
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  );
}
