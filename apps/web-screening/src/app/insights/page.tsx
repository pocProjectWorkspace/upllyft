'use client';

import Link from 'next/link';
import { Button, Card, Badge, Skeleton } from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import { useInsightsHistory } from '@/hooks/use-assessments';
import { formatDate } from '@/lib/utils';

export default function InsightsPage() {
  const { data: history, isLoading } = useInsightsHistory();

  const totalAnalyses = history?.length ?? 0;
  const latestDate = history?.[0]?.updatedAt || history?.[0]?.createdAt;

  return (
    <ScreeningShell>
      {/* ── Hero Banner ── */}
      <div className="-mx-4 sm:-mx-6 -mt-8 mb-10">
        <div className="gradient-dark px-6 sm:px-10 py-14 rounded-b-3xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Your Child&rsquo;s Insights
              </h1>
              <p className="text-gray-300 text-base sm:text-lg max-w-xl leading-relaxed">
                Personalized developmental insights based on your child&rsquo;s screening results
              </p>
            </div>
            <Link href="/insights/new">
              <Button className="gradient-teal text-white border-0 px-8 py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : totalAnalyses}
              </p>
              <p className="text-sm text-gray-500">Total Insights</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : new Set(history?.map(h => h.title?.split(' — ')[0])).size || 0}
              </p>
              <p className="text-sm text-gray-500">Children Analyzed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <Skeleton className="h-7 w-24 inline-block" />
                ) : latestDate ? (
                  <span className="text-lg">{formatDate(latestDate)}</span>
                ) : (
                  <span className="text-lg text-gray-400">—</span>
                )}
              </p>
              <p className="text-sm text-gray-500">Latest Insight</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Past Analyses ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Past Insights</h2>
          {totalAnalyses > 0 && (
            <Link href="/insights/new">
              <Button variant="outline" className="text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Analysis
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          /* ── Empty State ── */
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No insights yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create your first personalized insight based on your child&rsquo;s screening results. It only takes a minute!
            </p>
            <Link href="/insights/new">
              <Button className="gradient-teal text-white border-0 px-8 py-3 rounded-xl font-semibold">
                Create Your First Insight
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {history.map(item => (
              <Link key={item.id} href={`/insights/${item.id}`}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 card-hover cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {item.title || 'Developmental Insight'}
                    </h3>
                    <Badge color="green">Completed</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(item.updatedAt || item.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-teal-600 font-medium">View full insight</span>
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <div className="text-center pb-4">
        <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
          These insights are generated based on screening data and are meant to be helpful, not diagnostic.
          Always share results with your child&rsquo;s doctor or specialist for professional guidance.
        </p>
      </div>
    </ScreeningShell>
  );
}
