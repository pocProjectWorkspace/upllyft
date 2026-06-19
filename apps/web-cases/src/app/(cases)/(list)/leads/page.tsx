'use client';

import { useState } from 'react';
import { useMyClinic, useLeads, useUpdateLeadStatus } from '@/hooks/use-clinic-ops';
import type { LeadStatus } from '@/lib/api/clinic-ops';
import { formatDate } from '@/lib/utils';
import {
  Card, Badge, Skeleton, Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@upllyft/ui';
import { Inbox } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  NEW: 'blue', CONTACTED: 'yellow', QUALIFIED: 'green', WAITLISTED: 'gray',
  CONVERTED: 'green', OUT_OF_SCOPE: 'gray', DUPLICATE: 'gray', CLOSED: 'gray',
};
const STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WAITLISTED', 'CONVERTED', 'OUT_OF_SCOPE', 'DUPLICATE', 'CLOSED'];

export default function LeadsPage() {
  const { data: clinic } = useMyClinic();
  const clinicId = clinic?.id;
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const { data: leads, isLoading } = useLeads(clinicId, filter === 'ALL' ? undefined : filter);
  const updateStatus = useUpdateLeadStatus(clinicId || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">Enquiries and referrals before a patient record exists.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!clinicId ? (
        <Card className="p-8 text-center text-sm text-gray-500">No clinic context — leads are available to clinic administrators.</Card>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !leads?.length ? (
        <Card className="p-12 text-center text-sm text-gray-500"><Inbox className="h-8 w-8 text-gray-300 mx-auto mb-2" />No leads.</Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{l.contactName || 'Unnamed enquiry'}</span>
                    <Badge color={(STATUS_COLOR[l.status] || 'gray') as any}>{l.status}</Badge>
                    <Badge color={'gray' as any}>{l.channel}</Badge>
                  </div>
                  {l.concern && <p className="text-sm text-gray-600 mt-1">{l.concern}</p>}
                  <div className="text-sm text-gray-500 mt-1 space-x-3">
                    {l.contactPhone && <span>{l.contactPhone}</span>}
                    {l.contactEmail && <span>{l.contactEmail}</span>}
                    {l.referrerName && <span>Ref: {l.referrerName}</span>}
                    <span className="text-gray-400">{formatDate(l.createdAt)}</span>
                  </div>
                </div>
                <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, data: { status: v } })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
