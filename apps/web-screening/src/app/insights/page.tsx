'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Textarea,
} from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import { useInsightsHistory, useAnalyzeCase } from '@/hooks/use-assessments';
import { formatDate } from '@/lib/utils';

const EXAMPLE_QUERIES = [
  '4-year-old with speech delay and difficulty with social interactions. Currently receiving speech therapy twice a week. Main challenges are expressive language and turn-taking during play.',
  '6-year-old diagnosed with ADHD and sensory processing difficulties. Struggles with focus in classroom, fine motor tasks, and transitions between activities.',
  '2-year-old not meeting gross motor milestones. Not walking independently, limited pulling to stand. Born at 34 weeks gestation.',
];

// ── Icons ──

function BrainIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function ChartBarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// ── Priority Badge ──

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, 'red' | 'yellow' | 'green'> = {
    high: 'red',
    medium: 'yellow',
    low: 'green',
  };
  return <Badge color={colors[priority] || 'gray'}>{priority}</Badge>;
}

// ── Main Page ──

export default function InsightsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: history, isLoading: historyLoading } = useInsightsHistory();
  const analyzeMutation = useAnalyzeCase();

  function handleAnalyze() {
    if (!query.trim()) return;
    analyzeMutation.mutate(query, {
      onSuccess: (result) => {
        router.push(`/insights/${result.conversationId}`);
      },
    });
  }

  return (
    <ScreeningShell>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <BrainIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clinical Insights</h1>
        </div>
        <p className="text-gray-500 mt-1 ml-[52px]">
          AI-powered clinical analysis, evidence-based recommendations, and developmental observations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: New Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Analysis Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              New Analysis
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Describe a developmental case to receive AI-generated clinical insights, evidence-based
              recommendations, and relevant research.
            </p>
            <Textarea
              placeholder="Describe the child's age, diagnosis, current interventions, challenges, and goals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              className="mb-4"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Analysis typically takes 15-30 seconds</p>
              <Button
                onClick={handleAnalyze}
                disabled={!query.trim() || analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Analyze Case
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Example Queries */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Start Examples</h3>
            <div className="space-y-3">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-sm text-gray-600 leading-relaxed"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center mx-auto mb-3">
                <BrainIcon className="w-5 h-5 text-teal-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Case Analysis</h4>
              <p className="text-xs text-gray-500 mt-1">
                AI parses case details into structured clinical parameters
              </p>
            </Card>
            <Card className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Research-Backed</h4>
              <p className="text-xs text-gray-500 mt-1">
                PubMed articles and evidence-based recommendations
              </p>
            </Card>
            <Card className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Expert Connections</h4>
              <p className="text-xs text-gray-500 mt-1">
                Matched specialists and community resources
              </p>
            </Card>
          </div>
        </div>

        {/* Right column: History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Analyses</h2>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <BrainIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No analyses yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start a new analysis to see your history here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card
                  key={item.id}
                  hover
                  className="p-4 cursor-pointer"
                  onClick={() => router.push(`/insights/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {item.title || item.query || 'Clinical Analysis'}
                    </h3>
                    <ArrowRightIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {formatDate(item.createdAt)}
                    </span>
                    {item.confidence != null && (
                      <Badge color={item.confidence >= 0.7 ? 'green' : item.confidence >= 0.4 ? 'yellow' : 'red'}>
                        {Math.round(item.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-12 text-center">
        <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Clinical insights are AI-generated and should be reviewed by a qualified healthcare professional.
          They do not constitute medical advice, diagnosis, or treatment recommendations.
        </p>
      </div>
    </ScreeningShell>
  );
}
