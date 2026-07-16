'use client';

import { useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import { Flag, Sparkles, Lock, Send, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNursery } from './nursery-context';
import {
  useConcerns,
  useRaiseConcern,
  useUpdateConcernSummary,
  useShareConcern,
} from '@/hooks/use-nursery';
import { DEVELOPMENTAL_DOMAINS, type Concern } from '@/lib/api/nursery';

const domainLabel = (id: string) => DEVELOPMENTAL_DOMAINS.find(d => d.id === id)?.label ?? id;

/**
 * The concern → conversation pathway (F6), for the inclusion lead.
 *
 * The panel hides itself entirely if the API refuses the list — a plain keyworker isn't the
 * one who raises concerns, so they simply don't see it. When it does render, it turns the
 * hardest early-years conversation into something the lead can approach: it pulls the
 * evidence together, coaches them PRIVATELY on how to have the conversation, and lets them
 * shape the message the parent actually receives before sending it.
 */
export function ConcernPanel({ childId, childName }: { childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const { data: concerns, isLoading, isError } = useConcerns(facilityId ?? undefined, childId);
  const raise = useRaiseConcern(facilityId ?? '', childId);
  const { toast } = useToast();

  // The list is gated to inclusion roles server-side; a 403 means "not your job" → hide.
  if (isError) return null;
  if (isLoading) return <Skeleton className="h-28 w-full" />;

  const list = concerns ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Concerns</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            When something’s worth raising with {childName}’s parent — prepared with you, privately.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await raise.mutateAsync(undefined);
              toast({ title: 'Draft prepared — review it before sharing' });
            } catch (e: any) {
              toast({
                title: e?.response?.data?.message ?? 'Could not prepare a concern',
                variant: 'destructive',
              });
            }
          }}
          disabled={raise.isPending}
        >
          <Flag className="w-4 h-4 mr-1" />
          {raise.isPending ? 'Preparing…' : 'Raise a concern'}
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 mt-5">
          Nothing raised yet. When you’ve noted a few concerns or a screening flags something,
          “Raise a concern” gathers it and helps you prepare the conversation.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map(c => (
            <ConcernCard key={c.id} concern={c} childId={childId} childName={childName} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ConcernCard({ concern, childId, childName }: { concern: Concern; childId: string; childName: string }) {
  const { facilityId } = useNursery();
  const update = useUpdateConcernSummary(facilityId ?? '', childId);
  const share = useShareConcern(facilityId ?? '', childId);
  const { toast } = useToast();

  const [coachOpen, setCoachOpen] = useState(concern.status === 'DRAFT');
  const [summary, setSummary] = useState(concern.parentSummary);
  const [dirty, setDirty] = useState(false);

  const isDraft = concern.status === 'DRAFT';

  const statusBadge = {
    DRAFT: <Badge color="yellow">Draft</Badge>,
    SHARED: <Badge color="blue">Shared with parent</Badge>,
    ACKNOWLEDGED: <Badge color="green">Parent responded</Badge>,
    CLOSED: <Badge color="gray">Closed</Badge>,
  }[concern.status];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {statusBadge}
        {concern.domains.map(d => (
          <Badge key={d} color="gray">{domainLabel(d)}</Badge>
        ))}
        <span className="text-xs text-gray-400 ml-auto">
          {new Date(concern.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* The evidence it rests on. */}
      {concern.evidence && (
        <p className="text-xs text-gray-500 mb-3">
          Based on {concern.evidence.concernObservations ?? 0} concern observation
          {concern.evidence.concernObservations === 1 ? '' : 's'}
          {concern.evidence.bothSettingsAgree && concern.evidence.bothSettingsAgree.length > 0 && (
            <span className="text-amber-700"> · home and nursery both flagged {concern.evidence.bothSettingsAgree.map(domainLabel).join(', ')}</span>
          )}
        </p>
      )}

      {/* PRIVATE coaching — staff only, collapsible. */}
      {concern.staffCoaching && (
        <div className="mb-3">
          <button
            onClick={() => setCoachOpen(o => !o)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800"
          >
            {coachOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Sparkles className="w-3.5 h-3.5" />
            How to have this conversation
            <Lock className="w-3 h-3 text-gray-400" />
          </button>
          {coachOpen && (
            <div className="mt-2 p-3 rounded-lg bg-teal-50/60 border border-teal-100">
              <p className="text-[11px] uppercase tracking-wide text-teal-700 font-semibold mb-1.5">
                Private — just for you
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {concern.staffCoaching}
              </p>
            </div>
          )}
        </div>
      )}

      {/* The parent-facing message. */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">
          {isDraft ? `Message ${childName}’s parent will see — edit it to sound like you` : `Shared with ${childName}’s parent`}
        </p>
        {isDraft ? (
          <textarea
            value={summary}
            onChange={e => { setSummary(e.target.value); setDirty(true); }}
            rows={7}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-gray-50 border border-gray-100">
            {concern.parentSummary}
          </p>
        )}
      </div>

      {/* The parent's response, once they've acknowledged. */}
      {concern.parentResponse && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100">
          <p className="text-xs font-medium text-green-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {childName}’s parent replied
          </p>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{concern.parentResponse}</p>
        </div>
      )}

      {isDraft && (
        <div className="flex justify-end gap-2 mt-4">
          {dirty && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await update.mutateAsync({ concernId: concern.id, parentSummary: summary });
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
                if (dirty) await update.mutateAsync({ concernId: concern.id, parentSummary: summary });
                await share.mutateAsync(concern.id);
                toast({ title: `Shared with ${childName}’s parent` });
              } catch (e: any) {
                toast({ title: e?.response?.data?.message ?? 'Could not share', variant: 'destructive' });
              }
            }}
            disabled={share.isPending || !summary.trim()}
          >
            <Send className="w-4 h-4 mr-1" />
            Share with parent
          </Button>
        </div>
      )}
    </div>
  );
}
