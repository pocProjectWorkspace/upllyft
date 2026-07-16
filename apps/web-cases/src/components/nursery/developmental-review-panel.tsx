'use client';

import { useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import { CalendarCheck, Send, CheckCircle2 } from 'lucide-react';
import { useNursery } from './nursery-context';
import {
  useDevReviews,
  useCreateDevReview,
  useUpdateDevReview,
  useShareDevReview,
} from '@/hooks/use-nursery';
import { DEVELOPMENTAL_DOMAINS, type DevReview } from '@/lib/api/nursery';

const domainLabel = (id: string) => DEVELOPMENTAL_DOMAINS.find(d => d.id === id)?.label ?? id;

const statusBadge = (s: DevReview['status']) =>
  ({
    DRAFT: <Badge color="yellow">Draft</Badge>,
    SHARED: <Badge color="blue">Shared with parent</Badge>,
    ACKNOWLEDGED: <Badge color="green">Parent responded</Badge>,
  })[s];

/**
 * The early developmental review (~age 2) (F9), for the inclusion lead. Hides on 403.
 * Assembled from the child's screening; the lead edits the plain-language summary and shares.
 */
export function DevelopmentalReviewPanel({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const { data: reviews, isLoading, isError } = useDevReviews(facilityId ?? undefined, childId);
  const create = useCreateDevReview(facilityId ?? '', childId);
  const { toast } = useToast();

  if (isError) return null;
  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const list = reviews ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-teal-600" /> Developmental review
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A plain-language snapshot of how {childName} is getting on, built from their screening.
          </p>
        </div>
        {list.length === 0 && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await create.mutateAsync();
                toast({ title: 'Review drafted — edit it, then share' });
              } catch (e: any) {
                toast({ title: e?.response?.data?.message ?? 'Could not create the review', variant: 'destructive' });
              }
            }}
            disabled={create.isPending}
          >
            {create.isPending ? 'Preparing…' : 'Create review'}
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 mt-5">
          No review yet. Once an educator screening is completed, “Create review” assembles it into a
          summary you can share with {childName}’s family.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map(r => (
            <ReviewCard key={r.id} review={r} childId={childId} childName={childName} facilityId={facilityId ?? ''} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ReviewCard({ review, childId, childName, facilityId }: { review: DevReview; childId: string; childName: string; facilityId: string }) {
  const update = useUpdateDevReview(facilityId, childId);
  const share = useShareDevReview(facilityId, childId);
  const { toast } = useToast();
  const [summary, setSummary] = useState(review.summary);
  const [dirty, setDirty] = useState(false);
  const isDraft = review.status === 'DRAFT';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {statusBadge(review.status)}
        <span className="text-xs text-gray-500">at ~{review.ageMonths} months</span>
        {review.flaggedDomains.map(d => <Badge key={d} color="gray">{domainLabel(d)}</Badge>)}
      </div>

      <p className="text-xs font-medium text-gray-600 mb-1.5">
        {isDraft ? `Summary ${childName}’s family will see` : `Shared with ${childName}’s family`}
      </p>
      {isDraft ? (
        <textarea
          value={summary}
          onChange={e => { setSummary(e.target.value); setDirty(true); }}
          rows={5}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-gray-50 border border-gray-100">
          {review.summary}
        </p>
      )}

      {review.recommendation && (
        <p className="text-xs text-gray-500 mt-2"><span className="font-medium">Suggested next step:</span> {review.recommendation}</p>
      )}

      {review.parentResponse && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100">
          <p className="text-xs font-medium text-green-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {childName}’s family replied
          </p>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{review.parentResponse}</p>
        </div>
      )}

      {isDraft && (
        <div className="flex justify-end gap-2 mt-4">
          {dirty && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await update.mutateAsync({ reviewId: review.id, data: { summary } });
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
                if (dirty) await update.mutateAsync({ reviewId: review.id, data: { summary } });
                await share.mutateAsync(review.id);
                toast({ title: `Shared with ${childName}’s family` });
              } catch (e: any) {
                toast({ title: e?.response?.data?.message ?? 'Could not share', variant: 'destructive' });
              }
            }}
            disabled={share.isPending || !summary.trim()}
          >
            <Send className="w-4 h-4 mr-1" /> Share with family
          </Button>
        </div>
      )}
    </div>
  );
}
