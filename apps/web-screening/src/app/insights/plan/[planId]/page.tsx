'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Skeleton } from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import { getPlan } from '@/lib/api/insights';

interface PlanWeek {
  week: number;
  focus: string;
  activities: string[];
  goals: string;
}

interface StructuredPlan {
  title: string;
  weeks: PlanWeek[];
}

export default function PlanViewPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [plan, setPlan] = useState<StructuredPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const data = await getPlan(planId);
        setPlan(data);
      } catch (error) {
        console.error('Failed to load plan:', error);
      } finally {
        setLoading(false);
      }
    }
    if (planId) fetchPlan();
  }, [planId]);

  if (loading) {
    return (
      <ScreeningShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </ScreeningShell>
    );
  }

  if (!plan || !plan.weeks) {
    return (
      <ScreeningShell>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Plan not found</h2>
          <p className="text-gray-500 mb-6">This plan could not be loaded.</p>
          <Link href="/insights">
            <Button variant="outline">Back to Insights</Button>
          </Link>
        </div>
      </ScreeningShell>
    );
  }

  return (
    <ScreeningShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <Button variant="outline" onClick={() => window.print()}>
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Plan
            </span>
          </Button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{plan.title}</h1>
          <p className="text-gray-500">Personalized Implementation Roadmap</p>
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {plan.weeks.map((week) => (
            <div
              key={week.week}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm break-inside-avoid"
            >
              {/* Week header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-teal-700 text-sm font-bold">{week.week}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Week {week.week}: {week.focus}
                  </h2>
                </div>
              </div>

              {/* Week content */}
              <div className="p-6 grid md:grid-cols-2 gap-6">
                {/* Activities */}
                <div>
                  <h4 className="font-medium mb-3 text-xs uppercase tracking-wider text-gray-500">
                    Activities
                  </h4>
                  <ul className="space-y-2">
                    {week.activities.map((activity, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Goals */}
                <div>
                  <h4 className="font-medium mb-3 text-xs uppercase tracking-wider text-gray-500">
                    Goals
                  </h4>
                  <p className="text-sm bg-green-50 text-green-700 p-3 rounded-lg border border-green-100">
                    {week.goals}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="text-center py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
            This structured plan is AI-generated and should be reviewed by a qualified professional
            before implementation. Adjust activities and timelines based on your child&apos;s
            individual needs and progress.
          </p>
        </div>
      </div>

    </ScreeningShell>
  );
}
