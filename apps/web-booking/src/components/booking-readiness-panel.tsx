'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBookingReadiness,
  setBookingClearance,
  type FinancialClearanceStatus,
} from '@/lib/api/payer';
import { Card, Badge, Button, Skeleton, useToast } from '@upllyft/ui';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const CLEARANCE_COLOR: Record<FinancialClearanceStatus, string> = {
  NOT_REQUIRED: 'gray',
  PENDING: 'yellow',
  CLEARED: 'green',
  EXCEPTION_APPROVED: 'blue',
  BLOCKED: 'red',
};

/**
 * Reception pre-visit readiness — shows what is blocking encounter start for a
 * clinic booking (payment, financial clearance, pre-auth, consent, credential)
 * and lets staff mark cleared or record an approved exception.
 */
export function BookingReadinessPanel({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['booking-readiness', bookingId],
    queryFn: () => getBookingReadiness(bookingId),
    enabled: !!bookingId,
  });

  const clearance = useMutation({
    mutationFn: (status: FinancialClearanceStatus) => setBookingClearance(bookingId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-readiness', bookingId] });
      toast({ title: 'Financial clearance updated' });
    },
    onError: () => toast({ title: 'Failed to update clearance', variant: 'destructive' }),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold text-gray-900">Pre-visit readiness</h3>
        </div>
        <Badge color={(data.ready ? 'green' : 'red') as any}>{data.ready ? 'Ready' : 'Blocked'}</Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className="text-gray-500">Clearance: <Badge color={CLEARANCE_COLOR[data.financialClearance] as any}>{data.financialClearance}</Badge></span>
        <span className="text-gray-500">Route: <span className="text-gray-900">{data.paymentRoute}</span></span>
        <span className="text-gray-500">Payment: <span className="text-gray-900">{data.paymentStatus}</span></span>
      </div>

      {data.blockers.length ? (
        <ul className="space-y-1 mb-4">
          {data.blockers.map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" /> {b}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-green-600 mb-4">
          <CheckCircle2 className="h-4 w-4" /> No blockers — encounter can start.
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => clearance.mutate('CLEARED')} disabled={clearance.isPending}>
          Mark cleared
        </Button>
        <Button size="sm" variant="outline" onClick={() => clearance.mutate('EXCEPTION_APPROVED')} disabled={clearance.isPending}>
          Approve exception
        </Button>
      </div>
    </Card>
  );
}
