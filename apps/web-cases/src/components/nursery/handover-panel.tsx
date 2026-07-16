'use client';

import { useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import { FileOutput, Send, Lock, CheckCircle2 } from 'lucide-react';
import { useNursery } from './nursery-context';
import {
  useHandovers,
  useGenerateHandover,
  useUpdateHandover,
  useShareHandover,
} from '@/hooks/use-nursery';
import type { HandoverRecord, HandoverRecipient } from '@/lib/api/nursery';

const RECIPIENTS: { value: HandoverRecipient; label: string }[] = [
  { value: 'SCHOOL', label: 'A school' },
  { value: 'CLINICIAN', label: 'A clinician' },
  { value: 'OTHER', label: 'Someone else' },
];

/**
 * The onward handover record (F11), for the inclusion lead. Hides on 403. Assembles the
 * child's story for a school or clinician — but can only be SHARED once the guardian has
 * authorised the disclosure (reflected here: the Share button stays locked until they do).
 */
export function HandoverPanel({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const { data: records, isLoading, isError } = useHandovers(facilityId ?? undefined, childId);
  const generate = useGenerateHandover(facilityId ?? '', childId);
  const { toast } = useToast();
  const [recipient, setRecipient] = useState<HandoverRecipient>('SCHOOL');

  if (isError) return null;
  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const list = records ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileOutput className="w-4 h-4 text-teal-600" /> Onward handover
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {childName}’s story for whoever comes next — shared only once the family authorises it.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={recipient}
            onChange={e => setRecipient(e.target.value as HandoverRecipient)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {RECIPIENTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await generate.mutateAsync({ recipientType: recipient });
                toast({ title: 'Handover assembled — review it, then ask the family to authorise' });
              } catch (e: any) {
                toast({ title: e?.response?.data?.message ?? 'Could not assemble', variant: 'destructive' });
              }
            }}
            disabled={generate.isPending}
          >
            {generate.isPending ? 'Assembling…' : 'Assemble'}
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 mt-5">
          None prepared. When {childName} is moving on, assemble their observations, screenings, reviews,
          concerns and support into one record to hand over.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map(h => (
            <HandoverCard key={h.id} record={h} childId={childId} childName={childName} facilityId={facilityId ?? ''} />
          ))}
        </div>
      )}
    </Card>
  );
}

function HandoverCard({ record, childId, childName, facilityId }: { record: HandoverRecord; childId: string; childName: string; facilityId: string }) {
  const update = useUpdateHandover(facilityId, childId);
  const share = useShareHandover(facilityId, childId);
  const { toast } = useToast();
  const [summary, setSummary] = useState(record.summary);
  const [dirty, setDirty] = useState(false);
  const isDraft = record.status === 'DRAFT';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {record.status === 'SHARED' ? <Badge color="green">Shared</Badge> : <Badge color="yellow">Draft</Badge>}
        <span className="text-xs text-gray-500">
          for {record.recipientType === 'SCHOOL' ? 'a school' : record.recipientType === 'CLINICIAN' ? 'a clinician' : 'someone else'}
          {record.recipientName ? ` · ${record.recipientName}` : ''}
        </span>
        {record.guardianAuthorised ? (
          <Badge color="blue">Family authorised</Badge>
        ) : (
          <span className="text-xs text-amber-600 inline-flex items-center gap-1"><Lock className="w-3 h-3" /> awaiting family</span>
        )}
      </div>

      {isDraft ? (
        <textarea
          value={summary}
          onChange={e => { setSummary(e.target.value); setDirty(true); }}
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-gray-50 border border-gray-100">
          {record.summary}
        </p>
      )}

      {record.status === 'SHARED' && (
        <p className="mt-2 text-xs text-green-700 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Disclosed with the family’s authorisation
        </p>
      )}

      {isDraft && (
        <div className="flex justify-end gap-2 mt-4">
          {dirty && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await update.mutateAsync({ handoverId: record.id, data: { summary } });
                  setDirty(false);
                  toast({ title: 'Saved' });
                } catch (e: any) {
                  toast({ title: e?.response?.data?.message ?? 'Could not save', variant: 'destructive' });
                }
              }}
              disabled={update.isPending}
            >
              Save edits
            </Button>
          )}
          <Button
            onClick={async () => {
              try {
                if (dirty) await update.mutateAsync({ handoverId: record.id, data: { summary } });
                await share.mutateAsync(record.id);
                toast({ title: 'Handover shared' });
              } catch (e: any) {
                toast({ title: e?.response?.data?.message ?? 'Could not share', variant: 'destructive' });
              }
            }}
            disabled={share.isPending || !record.guardianAuthorised}
            title={record.guardianAuthorised ? undefined : 'The family must authorise this before it can be shared'}
          >
            <Send className="w-4 h-4 mr-1" /> Share onward
          </Button>
        </div>
      )}
    </div>
  );
}
