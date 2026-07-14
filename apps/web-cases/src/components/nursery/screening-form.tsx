'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, useToast } from '@upllyft/ui';
import { Loader2, EyeOff, Info, CheckCircle2 } from 'lucide-react';
import * as api from '@/lib/api/nursery';
import type { AnswerType, Questionnaire } from '@/lib/api/nursery';

/**
 * The educator screening form.
 *
 * THE MOST IMPORTANT CONTROL ON THIS PAGE IS "I HAVEN'T SEEN THIS".
 *
 * A keyworker asked about a child they haven't observed in some respect has two options:
 * guess, or say so. A guess gets scored as though it were an observation. An honest
 * "haven't seen it" is excluded from scoring entirely — neither numerator nor
 * denominator — and can never raise a red flag. So the entire quality of the data
 * depends on that button feeling as legitimate and as easy to press as any other.
 *
 * Which is why it is not buried in a "skip" link or styled as a failure. It sits with
 * the other answers, it is explained, and the form does not nag about it. A keyworker
 * who feels judged for using it will stop using it, and then we are scoring guesses and
 * calling the result a signal.
 */

const ANSWERS: { value: AnswerType; label: string; hint?: string }[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'SOMETIMES', label: 'Sometimes' },
  { value: 'NO', label: 'Not yet' },
  { value: 'NOT_SURE', label: 'Not sure', hint: 'I’ve seen them, but I can’t tell' },
];

interface Props {
  assessmentId: string;
  childName: string;
  onDone: () => void;
}

export function ScreeningForm({ assessmentId, childName, onDone }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerType>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // useEffect, not useMemo — this is a side effect. useMemo is for deriving a value and
  // may be re-run or skipped at React's discretion; fetching inside it is a latent bug.
  useEffect(() => {
    let cancelled = false;
    api
      .getTier1(assessmentId)
      .then(q => {
        if (!cancelled) setForm(q);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const allItems = useMemo(
    () => (form?.domains ?? []).flatMap(d => d.questions),
    [form],
  );
  const answered = allItems.filter(q => answers[q.id]).length;
  const notObserved = allItems.filter(q => answers[q.id] === 'NOT_OBSERVED').length;
  const complete = allItems.length > 0 && answered === allItems.length;

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.submitTier1(
        assessmentId,
        allItems.map(q => ({ questionId: q.id, answer: answers[q.id] })),
      );
      toast({ title: `Screening saved for ${childName}` });
      onDone();
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message ?? 'Could not save the screening',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto my-12" />;
  if (!form) return <p className="text-sm text-gray-500">Could not load the questionnaire.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Developmental check — {childName}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {form.displayName} · about {form.estimatedTime}
        </p>
      </div>

      {/*
        Said up front, because it changes how they answer everything below. A keyworker
        who believes they must have an opinion on every question will manufacture one.
      */}
      <Card className="p-4 bg-teal-50 border-teal-100">
        <div className="flex gap-2.5 text-sm text-teal-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
          <p>
            Answer only what you’ve actually seen. If you haven’t seen {childName} do
            something, say so — <strong>“I haven’t seen this” is a proper answer</strong>, not
            a gap. It’s left out of the scoring entirely, and it’s far more useful to us than
            a guess.
          </p>
        </div>
      </Card>

      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {answered} of {allItems.length} answered
            {notObserved > 0 && (
              <span className="text-gray-400"> · {notObserved} not seen</span>
            )}
          </span>
          <div className="w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${(answered / Math.max(allItems.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {form.domains.map(domain => (
        <Card key={domain.domainId} className="p-6">
          <h2 className="font-semibold text-gray-900">{domain.domainName}</h2>
          {domain.description && (
            <p className="text-xs text-gray-500 mt-1 mb-4 line-clamp-2">{domain.description}</p>
          )}

          <div className="space-y-5 mt-4">
            {domain.questions.map(q => {
              const chosen = answers[q.id];
              return (
                <div key={q.id} className="pb-5 border-b border-gray-50 last:border-0 last:pb-0">
                  <p className="text-sm text-gray-900">{q.question}</p>
                  {q.whyWeAsk && (
                    <p className="text-xs text-gray-400 mt-0.5">{q.whyWeAsk}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {ANSWERS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => setAnswers(s => ({ ...s, [q.id]: a.value }))}
                        title={a.hint}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          chosen === a.value
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}

                    {/*
                      Deliberately NOT a "skip" link and NOT styled as a failure state. It
                      sits alongside the real answers because it IS a real answer — the
                      honest one — and the data is only worth anything if pressing it feels
                      as legitimate as pressing "Yes".
                    */}
                    <button
                      onClick={() => setAnswers(s => ({ ...s, [q.id]: 'NOT_OBSERVED' }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-1.5 ${
                        chosen === 'NOT_OBSERVED'
                          ? 'bg-gray-700 border-gray-700 text-white'
                          : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      I haven’t seen this
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between sticky bottom-0 bg-gray-50/95 backdrop-blur py-4">
        <p className="text-sm text-gray-500">
          {complete ? (
            <span className="inline-flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="w-4 h-4" /> All questions answered
            </span>
          ) : (
            `${allItems.length - answered} left`
          )}
        </p>
        <Button onClick={submit} disabled={!complete || submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Finish
        </Button>
      </div>
    </div>
  );
}
