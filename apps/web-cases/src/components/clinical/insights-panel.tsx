'use client';

import { Card, Button, Badge } from '@upllyft/ui';
import {
  Sparkles, Loader2, AlertTriangle, Lightbulb, ThumbsUp,
  Target, Home, ListChecks, RefreshCw,
} from 'lucide-react';
import type { ClinicalInsights } from '@/lib/api/clinical';
import { useGenerateInsights } from '@/hooks/use-clinical';

interface Props {
  caseId: string;
  recordId: string;
  insights?: ClinicalInsights | null;
  generatedAt?: string | null;
  model?: string | null;
}

export function InsightsPanel({ caseId, recordId, insights, generatedAt, model }: Props) {
  const gen = useGenerateInsights();
  const run = () => gen.mutate({ caseId, recordId });

  if (!insights) {
    return (
      <Card className="p-6 border-teal-100 bg-gradient-to-br from-teal-50/60 to-white">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">AI clinical insights</h3>
            <p className="text-sm text-gray-500 mb-3">
              Generate a clinician-facing analysis of this assessment — key findings, strengths,
              concerns, recommendations and suggested goals. AI-assisted; review before use.
            </p>
            <Button onClick={run} disabled={gen.isPending}>
              {gen.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Generate insights</>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-teal-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold text-gray-900">AI clinical insights</h3>
          {model && <Badge color="purple">{model.startsWith('claude') ? 'Claude' : model}</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={run} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1">Regenerate</span>
        </Button>
      </div>

      {insights.summary && (
        <div className="rounded-lg bg-teal-50/70 border border-teal-100 p-4 mb-4">
          <p className="text-sm text-gray-800 leading-relaxed">{insights.summary}</p>
        </div>
      )}

      {insights.riskFlags?.length > 0 && (
        <Section icon={<AlertTriangle className="h-4 w-4 text-red-500" />} title="Risk / safeguarding flags" tone="red">
          {insights.riskFlags.map((r, i) => <li key={i}>{r}</li>)}
        </Section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {insights.keyFindings?.length > 0 && (
          <Section icon={<Lightbulb className="h-4 w-4 text-amber-500" />} title="Key findings">
            {insights.keyFindings.map((r, i) => <li key={i}>{r}</li>)}
          </Section>
        )}
        {insights.strengths?.length > 0 && (
          <Section icon={<ThumbsUp className="h-4 w-4 text-green-600" />} title="Strengths" tone="green">
            {insights.strengths.map((r, i) => <li key={i}>{r}</li>)}
          </Section>
        )}
        {insights.concerns?.length > 0 && (
          <Section icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} title="Areas of concern" tone="amber">
            {insights.concerns.map((r, i) => <li key={i}>{r}</li>)}
          </Section>
        )}
        {insights.recommendations?.length > 0 && (
          <Section icon={<ListChecks className="h-4 w-4 text-teal-600" />} title="Recommendations">
            {insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </Section>
        )}
      </div>

      {insights.suggestedGoals?.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-teal-600" />
            <p className="text-sm font-semibold text-gray-800">Suggested goals</p>
          </div>
          <div className="space-y-2">
            {insights.suggestedGoals.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-sm border border-gray-100 rounded-lg p-3">
                {g.domain && <Badge color="blue">{g.domain}</Badge>}
                <span className="text-gray-700">{g.goal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.parentGuidance?.length > 0 && (
        <Section icon={<Home className="h-4 w-4 text-gray-500" />} title="Home guidance for caregivers" className="mt-4">
          {insights.parentGuidance.map((r, i) => <li key={i}>{r}</li>)}
        </Section>
      )}

      <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
        {insights.disclaimer ?? 'AI-assisted — review before use.'}
        {generatedAt ? ` · generated ${new Date(generatedAt).toLocaleString()}` : ''}
      </p>
    </Card>
  );
}

function Section({
  icon, title, tone, className = '', children,
}: {
  icon: React.ReactNode; title: string; tone?: 'red' | 'green' | 'amber'; className?: string; children: React.ReactNode;
}) {
  const toneCls =
    tone === 'red' ? 'bg-red-50 border-red-100'
      : tone === 'green' ? 'bg-green-50 border-green-100'
        : tone === 'amber' ? 'bg-amber-50 border-amber-100'
          : 'bg-gray-50 border-gray-100';
  return (
    <div className={`rounded-lg border p-3 ${toneCls} ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-sm font-semibold text-gray-800">{title}</p>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 marker:text-gray-300">
        {children}
      </ul>
    </div>
  );
}
