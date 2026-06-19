'use client';

import { useState } from 'react';
import { useCase } from '@/hooks/use-cases';
import { useDischarge } from '@/hooks/use-clinic-ops';
import { caseStatusColors, caseStatusLabels, formatDate } from '@/lib/utils';
import { Button, Card, Badge, Label, Textarea, Input } from '@upllyft/ui';
import { LogOut, Archive, RotateCcw } from 'lucide-react';

export function DischargeTab({ caseId }: { caseId: string }) {
  const { data: caseData } = useCase(caseId);
  const status = (caseData as any)?.status as string | undefined;
  const { discharge, archive, reactivate } = useDischarge(caseId);

  const [clinicalReason, setClinicalReason] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [retentionDays, setRetentionDays] = useState<string>('');
  const [result, setResult] = useState<{ cancelledBookings?: number; openBilling?: number } | null>(null);

  const isDischarged = status === 'DISCHARGED' || status === 'ARCHIVED';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Discharge &amp; Retention</h2>
        {status && <Badge color={(caseStatusColors[status] || 'gray') as any}>{caseStatusLabels[status] || status}</Badge>}
      </div>

      {!isDischarged ? (
        <Card className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Discharging cancels upcoming appointments and surfaces any open billing. The clinic EHR remains the legal record — Upllyft soft-archives.</p>
          <div><Label>Clinical discharge reason</Label><Textarea rows={2} value={clinicalReason} onChange={(e) => setClinicalReason(e.target.value)} placeholder="e.g. goals met / transfer of care" /></div>
          <div><Label>Administrative reason</Label><Textarea rows={2} value={adminReason} onChange={(e) => setAdminReason(e.target.value)} placeholder="e.g. payer ended / family relocated" /></div>
          <div className="w-48"><Label>Retention (days, default ~7y)</Label><Input type="number" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} /></div>
          <Button
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700"
            disabled={discharge.isPending}
            onClick={async () => {
              const res: any = await discharge.mutateAsync({
                clinicalReason: clinicalReason || undefined,
                adminReason: adminReason || undefined,
                retentionDays: retentionDays ? Number(retentionDays) : undefined,
              });
              setResult({ cancelledBookings: res?.cancelledBookings, openBilling: res?.openBilling });
            }}
          >
            <LogOut className="h-4 w-4 mr-1" /> Discharge case
          </Button>
          {result && (
            <p className="text-sm text-gray-600">
              Discharged. Cancelled {result.cancelledBookings ?? 0} future appointment(s).{' '}
              {result.openBilling ? <span className="text-amber-600">{result.openBilling} open billing item(s) need reconciliation.</span> : 'No open billing.'}
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          {(caseData as any)?.dischargedAt && <p className="text-sm text-gray-500">Discharged {formatDate((caseData as any).dischargedAt)}.</p>}
          {(caseData as any)?.retentionUntil && <p className="text-sm text-gray-500">Retain until {formatDate((caseData as any).retentionUntil)}.</p>}
          <div className="flex gap-2">
            <Button variant="outline" disabled={archive.isPending || status === 'ARCHIVED'} onClick={() => archive.mutate()}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
            <Button variant="outline" disabled={reactivate.isPending} onClick={() => reactivate.mutate()}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reactivate
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
