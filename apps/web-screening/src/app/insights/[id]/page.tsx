'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Textarea,
} from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useInsightConversation,
  useFollowUp,
  useSubmitFeedback,
} from '@/hooks/use-assessments';
import { formatDate } from '@/lib/utils';
import type {
  ClinicalInsight,
  DetailedRecommendation,
  PubMedArticle,
  ExpertConnection,
} from '@/lib/api/insights';

// ── Helpers ──

function getPriorityColor(priority: string): 'red' | 'yellow' | 'green' {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'yellow';
  return 'green';
}

// ── Recommendation Card ──

function RecommendationCard({ rec }: { rec: DetailedRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="p-5 rounded-xl">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
        <Badge color={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{rec.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>Timeline: {rec.timeline}</span>
        <span>Est. Cost: {rec.costEstimate}</span>
      </div>
      {rec.availability && (
        <div className="flex items-center gap-2 mb-3">
          {rec.availability.telehealth && (
            <Badge color="blue">Telehealth</Badge>
          )}
          {rec.availability.languages?.map((lang) => (
            <Badge key={lang} color="gray">{lang}</Badge>
          ))}
        </div>
      )}
      {rec.actionSteps && rec.actionSteps.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Hide' : 'Show'} Action Steps ({rec.actionSteps.length})
          </button>
          {expanded && (
            <ol className="mt-3 space-y-2 pl-1">
              {rec.actionSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Card>
  );
}

// ── Article Card ──

function ArticleCard({ article }: { article: PubMedArticle }) {
  return (
    <Card className="p-4 rounded-xl">
      <h4 className="font-medium text-gray-900 text-sm leading-snug mb-1">{article.title}</h4>
      <p className="text-xs text-gray-500 mb-2">
        {article.journal} ({article.year})
        {article.authors && article.authors.length > 0 && ` - ${article.authors.slice(0, 3).join(', ')}${article.authors.length > 3 ? ' et al.' : ''}`}
      </p>
      {article.abstract && (
        <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{article.abstract}</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        {article.doi && (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            DOI
          </a>
        )}
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:text-teal-700"
        >
          PubMed
        </a>
      </div>
    </Card>
  );
}

// ── Expert Card ──

function ExpertCard({ expert }: { expert: ExpertConnection }) {
  return (
    <Card className="p-4 rounded-xl">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">{expert.name}</h4>
          <p className="text-xs text-gray-500">{expert.role}{expert.organization ? ` at ${expert.organization}` : ''}</p>
        </div>
        <Badge color="green">{Math.round(expert.trustScore * 100)}% trust</Badge>
      </div>
      {expert.specialization && expert.specialization.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {expert.specialization.map((spec) => (
            <span key={spec} className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
              {spec}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">{expert.yearsOfExperience} years experience</p>
    </Card>
  );
}

// ── Main Page ──

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<'analysis' | 'research' | 'experts'>('analysis');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null);

  const { data: conversation, isLoading, error } = useInsightConversation(id);
  const followUpMutation = useFollowUp();
  const feedbackMutation = useSubmitFeedback();

  // Extract the latest insights from the conversation messages
  const latestInsights: ClinicalInsight | null = (() => {
    if (!conversation?.messages) return null;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (msg.role === 'assistant' && msg.metadata?.insights) {
        return msg.metadata.insights;
      }
    }
    return null;
  })();

  function handleFollowUp() {
    if (!followUpQuery.trim()) return;
    followUpMutation.mutate(
      { conversationId: id, query: followUpQuery },
      { onSuccess: () => setFollowUpQuery('') },
    );
  }

  function handleFeedback(value: 1 | -1) {
    setFeedbackGiven(value);
    feedbackMutation.mutate({ conversationId: id, value });
  }

  // Loading
  if (isLoading) {
    return (
      <ScreeningShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </ScreeningShell>
    );
  }

  // Error
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

  const tabs = [
    { id: 'analysis' as const, label: 'Analysis' },
    { id: 'research' as const, label: 'Research' },
    { id: 'experts' as const, label: 'Experts' },
  ];

  return (
    <ScreeningShell>
      <div className="space-y-6">
        {/* Back + Header */}
        <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Insights
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {conversation.title || 'Clinical Analysis'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(conversation.createdAt)}</p>
          </div>
          {/* Feedback */}
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

        {/* KPI Metrics */}
        {latestInsights && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(latestInsights.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Confidence</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {latestInsights.evidenceBasedRecommendations.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Recommendations</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {latestInsights.researchArticles.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Articles</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {latestInsights.expertConnections.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Experts</div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {latestInsights ? (
          <div>
            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {/* Case Analysis */}
                <Card className="p-5 rounded-xl border-l-4 border-teal-400">
                  <h3 className="font-semibold text-gray-900 mb-3">Case Analysis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {latestInsights.caseAnalysis.age && (
                      <div>
                        <span className="font-medium text-gray-500">Age:</span>{' '}
                        <span className="text-gray-900">{latestInsights.caseAnalysis.age}</span>
                      </div>
                    )}
                    {latestInsights.caseAnalysis.diagnosis.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-500">Diagnosis:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {latestInsights.caseAnalysis.diagnosis.map((d) => (
                            <Badge key={d} color="purple">{d}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {latestInsights.caseAnalysis.challenges.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-500">Challenges:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {latestInsights.caseAnalysis.challenges.map((c) => (
                            <Badge key={c} color="yellow">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {latestInsights.caseAnalysis.interventions.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-500">Current Interventions:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {latestInsights.caseAnalysis.interventions.map((i) => (
                            <Badge key={i} color="blue">{i}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Evidence-Based Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Evidence-Based Recommendations
                  </h3>
                  <div className="space-y-4">
                    {latestInsights.evidenceBasedRecommendations.map((rec, idx) => (
                      <RecommendationCard key={idx} rec={rec} />
                    ))}
                  </div>
                </div>

                {/* Alternative Approaches */}
                {latestInsights.alternativeApproaches.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Alternative Approaches
                    </h3>
                    <div className="space-y-4">
                      {latestInsights.alternativeApproaches.map((rec, idx) => (
                        <RecommendationCard key={idx} rec={rec} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Research Tab */}
            {activeTab === 'research' && (
              <div className="space-y-4">
                {latestInsights.researchArticles.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-gray-500">No research articles found for this analysis.</p>
                  </Card>
                ) : (
                  latestInsights.researchArticles.map((article) => (
                    <ArticleCard key={article.pmid} article={article} />
                  ))
                )}
                {latestInsights.citations && latestInsights.citations.length > 0 && (
                  <Card className="p-5 rounded-xl mt-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Citations</h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {latestInsights.citations.map((citation, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-gray-400 shrink-0">[{idx + 1}]</span>
                          {citation}
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </div>
            )}

            {/* Experts Tab */}
            {activeTab === 'experts' && (
              <div className="space-y-4">
                {latestInsights.expertConnections.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-gray-500">No expert connections found for this analysis.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {latestInsights.expertConnections.map((expert, idx) => (
                      <ExpertCard key={expert.id || idx} expert={expert} />
                    ))}
                  </div>
                )}
                {/* Similar Cases */}
                {latestInsights.similarCases.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Cases</h3>
                    <div className="space-y-3">
                      {latestInsights.similarCases.map((sc, idx) => (
                        <Card key={sc.id || idx} className="p-4 rounded-xl">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">{sc.title}</h4>
                            <Badge color="blue">{Math.round(sc.similarity * 100)}% match</Badge>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-3 mb-2">{sc.content}</p>
                          <p className="text-xs text-gray-500">
                            By {sc.authorName} ({sc.authorRole})
                          </p>
                          {sc.relevanceExplanation && (
                            <p className="text-xs text-teal-600 mt-1">{sc.relevanceExplanation}</p>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No insights available for this conversation.</p>
          </Card>
        )}

        {/* Follow-up Input */}
        <Card className="p-5 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Ask a Follow-up Question</h3>
          <div className="flex gap-3">
            <Textarea
              placeholder="Ask a follow-up question about this analysis..."
              value={followUpQuery}
              onChange={(e) => setFollowUpQuery(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleFollowUp}
              disabled={!followUpQuery.trim() || followUpMutation.isPending}
              className="shrink-0 self-end"
            >
              {followUpMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 max-w-2xl mx-auto">
            Clinical insights are AI-generated and should be reviewed by a qualified healthcare professional.
          </p>
        </div>
      </div>
    </ScreeningShell>
  );
}
