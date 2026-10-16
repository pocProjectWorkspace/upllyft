'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Textarea } from '@upllyft/ui';
import { Eye, Share2 } from 'lucide-react';
import { useShareParentSummary } from '@/cases/hooks/use-cases';
import type { CaseSession, ParentSummary } from '@/cases/lib/api/cases';
import { formatDateTime } from '@/cases/lib/utils';

/**
 * The only part of a signed session note the family ever sees, in their Clinic
 * Portal: what we worked on, how it went, and what to try at home. Starts from the
 * note's parent-guidance answers so the therapist edits rather than re-types.
 */
export function ParentSummaryCard({ caseId, session }: { caseId: string; session: CaseSession }) {
  const share = useShareParentSummary();
  const sn = (session.structuredNotes ?? {}) as Record<string, any>;
  const answers = (sn.answers ?? {}) as Record<string, any>;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');

  const initial: ParentSummary = session.parentSummary ?? {
    workedOn: text(sn.subjective) || text(sn.objectives) || '',
    howTheyDid: text(sn.assessment) || text(sn.response) || '',
    tryAtHome: text(answers.homeProgramme) || text(answers.parentTraining) || text(sn.plan) || '',
  };
  const [draft, setDraft] = useState<ParentSummary>(initial);
  const [editing, setEditing] = useState(!session.parentSummarySharedAt);
  useEffect(() => {
    setDraft(initial);
    setEditing(!session.parentSummarySharedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.parentSummarySharedAt]);

  const shared = !!session.parentSummarySharedAt;
  const fields: Array<[keyof ParentSummary, string, string]> = [
    ['workedOn', 'What we worked on', 'e.g. Two-word phrases during play, like “more ball”.'],
    ['howTheyDid', 'How it went', 'e.g. Stayed engaged for most of the session and enjoyed a movement break.'],
    ['tryAtHome', 'Try at home this week', 'e.g. At snack time, pause for 5 seconds before offering more.'],
  ];

  return (
    <Card className="p-5 border border-teal-100 bg-teal-50/30 mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-teal-600" />
            Summary for the family
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {shared
              ? `Shared ${formatDateTime(session.parentSummarySharedAt!)} · shown in the family’s Clinic Portal`
              : 'Plain-language and parent-friendly. The clinical note itself is never shared.'}
          </p>
          {shared && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${session.parentViewedAt ? 'text-teal-700' : 'text-gray-400'}`}>
              <Eye className="h-3.5 w-3.5" />
              {session.parentViewedAt ? `Viewed by parent ${formatDateTime(session.parentViewedAt)}` : 'Not viewed yet'}
            </p>
          )}
        </div>
        {shared && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => share.mutate({ caseId, sessionId: session.id, summary: null })}>
              Stop sharing
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {fields.map(([key, label, placeholder]) =>
          editing ? (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <Textarea
                rows={2}
                value={draft[key] ?? ''}
                placeholder={placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </div>
          ) : draft[key] ? (
            <div key={key}>
              <p className="text-xs font-medium text-teal-700 uppercase">{label}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{draft[key]}</p>
            </div>
          ) : null,
        )}
      </div>

      {editing && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() =>
              share.mutate(
                { caseId, sessionId: session.id, summary: draft },
                { onSuccess: () => setEditing(false) },
              )
            }
            disabled={share.isPending || !(draft.workedOn || draft.howTheyDid || draft.tryAtHome)}
          >
            {shared ? 'Update shared summary' : 'Share with family'}
          </Button>
          {shared && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
