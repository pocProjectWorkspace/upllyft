'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, APP_URLS } from '@upllyft/api-client';
import { Button, Skeleton, MiraNudge } from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useInsightConversation,
  useSubmitFeedback,
} from '@/hooks/use-assessments';
import type { ClinicalInsight } from '@/lib/api/insights';
import { InsightSidebar, InsightMobileTabs, type TabId } from './components/InsightSidebar';
import { CaseInfoHeader } from './components/CaseInfoHeader';
import { AnalysisTab } from './components/AnalysisTab';
import { EvidenceTab } from './components/EvidenceTab';
import { CommunityTab } from './components/CommunityTab';
import { ExpertsTab } from './components/ExpertsTab';
import { OrganisationsTab } from './components/OrganisationsTab';
import { ConversationsTab } from './components/ConversationsTab';
import { FollowUpInput } from './components/FollowUpInput';

function MiraNudgeForParent({ nudgeId, message, chipText, childName }: { nudgeId: string; message: string; chipText: string; childName?: string }) {
  const { user } = useAuth();
  if (user?.role !== 'USER') return null;
  return <MiraNudge nudgeId={nudgeId} message={message} chipText={chipText} childName={childName} mainAppUrl={APP_URLS.main} />;
}

export default function InsightDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null);

  const { data: conversation, isLoading, error } = useInsightConversation(id);
  const feedbackMutation = useSubmitFeedback();

  // Extract the latest insights from conversation messages
  const latestInsights: ClinicalInsight | null = (() => {
    if (!conversation?.messages) return null;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (msg.role === 'assistant' && msg.metadata) {
        const meta = msg.metadata as any;
        if (meta.caseAnalysis) return meta as ClinicalInsight;
        if (meta.insights?.caseAnalysis) return meta.insights as ClinicalInsight;
      }
    }
    return null;
  })();

  function handleFeedback(value: 1 | -1) {
    setFeedbackGiven(value);
    feedbackMutation.mutate({ conversationId: id, value });
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <ScreeningShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 rounded-2xl" />
          <div className="flex gap-8">
            <Skeleton className="h-96 w-64 rounded-2xl hidden lg:block" />
            <div className="flex-1 space-y-6">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          </div>
        </div>
      </ScreeningShell>
    );
  }

  // ── Error ──
  if (error || !conversation) {
    return (
      <ScreeningShell>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load insight</h2>
          <p className="text-gray-500 mb-6">This analysis could not be loaded.</p>
          <Link href="/insights">
            <Button variant="outline">Back to Insights</Button>
          </Link>
        </div>
      </ScreeningShell>
    );
  }

  const insights = latestInsights;

  // Tab counts for badges
  const counts: Partial<Record<TabId, number>> = insights ? {
    evidence: insights.researchArticles?.length || 0,
    community: insights.communities?.length || 0,
    experts: insights.expertConnections?.length || 0,
    organisations: insights.organizations?.length || 0,
  } : {};

  return (
    <ScreeningShell>
      <div className="space-y-6">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Insights
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback(1)}
              className={`p-2 rounded-lg transition-colors ${feedbackGiven === 1 ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleFeedback(-1)}
              className={`p-2 rounded-lg transition-colors ${feedbackGiven === -1 ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Case Info Header ── */}
        <CaseInfoHeader
          conversationId={id}
          child={insights?.child}
          assessmentDate={insights?.assessmentDate}
          createdAt={conversation.createdAt}
          riskLevel={insights?.overallAssessment?.riskLevel}
          diagnosis={insights?.caseAnalysis?.diagnosis}
        />

        {/* Mira Nudge */}
        <MiraNudgeForParent
          childName={insights?.child?.name}
          nudgeId="insight-detail"
          message="Have questions about this insight? I can explain any section in simpler terms."
          chipText="Help me understand this developmental insight"
        />

        {/* ── Mobile Tabs ── */}
        <InsightMobileTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        {/* ── Sidebar + Content ── */}
        <div className="flex gap-8">
          <InsightSidebar activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

          <div className="flex-1 min-w-0 space-y-6">
            {insights ? (
              <>
                {activeTab === 'analysis' && <AnalysisTab insights={insights} />}
                {activeTab === 'evidence' && <EvidenceTab articles={insights.researchArticles} />}
                {activeTab === 'community' && <CommunityTab communities={insights.communities} />}
                {activeTab === 'experts' && <ExpertsTab experts={insights.expertConnections} />}
                {activeTab === 'organisations' && <OrganisationsTab organizations={insights.organizations} />}
                {activeTab === 'conversations' && <ConversationsTab conversationId={id} />}
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <p className="text-gray-500">No insights available for this conversation.</p>
              </div>
            )}

            {/* ── Follow-up Input ── */}
            <FollowUpInput conversationId={id} />

            {/* ── Disclaimer ── */}
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
                This report was generated using UFMF v2.0, a multi-domain developmental screening framework.
                It is NOT a medical or psychological diagnosis. Diagnostic classification remains the
                responsibility of qualified clinicians. Clinical connections are hypothesis-generating for
                referral and intervention planning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScreeningShell>
  );
}
