'use client';

import { useState } from 'react';
import { Badge, Button, toast } from '@upllyft/ui';
import { createStructuredPlan } from '@/lib/api/insights';
import type {
  ClinicalInsight,
  DetailedRecommendation,
  DomainAnalysisItem,
  ClinicalCorrelation,
} from '@/lib/api/insights';

// ── Helpers ──

function getRiskColor(level: string) {
  if (level === 'high') return { bg: 'bg-red-100', text: 'text-red-700' };
  if (level === 'moderate') return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-green-100', text: 'text-green-700' };
}

function getDomainBorderColor(status: string) {
  if (status === 'concern') return 'border-l-red-500';
  if (status === 'monitor') return 'border-l-amber-500';
  return 'border-l-green-500';
}

function getDomainStatusBadge(status: string): { color: 'green' | 'yellow' | 'red'; label: string } {
  if (status === 'concern') return { color: 'red', label: 'Needs Attention' };
  if (status === 'monitor') return { color: 'yellow', label: 'Monitor' };
  return { color: 'green', label: 'On Track' };
}

function getUrgencyBadge(priority: string): { color: 'red' | 'yellow' | 'green'; label: string } {
  if (priority === 'high') return { color: 'red', label: 'High' };
  if (priority === 'medium') return { color: 'yellow', label: 'Medium' };
  return { color: 'green', label: 'Routine' };
}

function DomainIcon({ domain }: { domain: string }) {
  const d = domain.toLowerCase();
  let icon = '🧠';
  if (d.includes('gross') || d.includes('motor')) icon = '🏃';
  if (d.includes('fine')) icon = '✋';
  if (d.includes('speech') || d.includes('language')) icon = '🗣';
  if (d.includes('social') || d.includes('emotional')) icon = '🤝';
  if (d.includes('cognitive') || d.includes('learning')) icon = '🧠';
  if (d.includes('adaptive') || d.includes('self-care')) icon = '🧹';
  if (d.includes('sensory')) icon = '🌀';
  if (d.includes('vision') || d.includes('hearing')) icon = '👁';
  return <span className="text-lg">{icon}</span>;
}

interface AnalysisTabProps {
  insights: ClinicalInsight;
}

export function AnalysisTab({ insights }: AnalysisTabProps) {
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set());
  const [creatingPlanIdx, setCreatingPlanIdx] = useState<number | null>(null);

  function toggleRec(idx: number) {
    setExpandedRecs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-8 fade-in">
      {/* ── Overall Assessment ── */}
      {insights.overallAssessment && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Overall Picture</h2>
            {insights.overallAssessment.riskLevel && (() => {
              const risk = getRiskColor(insights.overallAssessment!.riskLevel);
              return (
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${risk.bg} ${risk.text}`}>
                  {insights.overallAssessment!.riskLevel.charAt(0).toUpperCase() + insights.overallAssessment!.riskLevel.slice(1)} Risk
                </span>
              );
            })()}
          </div>
          {insights.overallAssessment.developmentalAge && (
            <p className="text-sm text-gray-500 mb-2">
              Developmental age equivalent: <span className="font-medium text-gray-700">{insights.overallAssessment.developmentalAge}</span>
            </p>
          )}
          <p className="text-lg font-medium text-gray-800 mb-3">{insights.overallAssessment.headline}</p>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{insights.overallAssessment.summary}</p>
        </div>
      )}

      {/* ── Domain Analysis ── */}
      {insights.domainAnalysis && insights.domainAnalysis.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">How Each Area Looks</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.domainAnalysis.map((domain: DomainAnalysisItem, idx: number) => {
              const statusInfo = getDomainStatusBadge(domain.status);
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${getDomainBorderColor(domain.status)} p-6 shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DomainIcon domain={domain.domain} />
                      <h3 className="font-semibold text-gray-900">{domain.domain}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">{domain.score}%</span>
                      <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        domain.status === 'concern' ? 'bg-red-500' :
                        domain.status === 'monitor' ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${domain.score}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{domain.clinicalAnalysis}</p>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">What This Means Day-to-Day</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{domain.impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clinical Correlations ── */}
      {insights.clinicalCorrelations && insights.clinicalCorrelations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Observations</h2>
          <div className="relative">
            <div className="absolute left-[9px] top-2 bottom-2 w-1 bg-teal-200 rounded-full" />
            <div className="space-y-6">
              {insights.clinicalCorrelations.map((corr: ClinicalCorrelation, idx: number) => (
                <div key={idx} className="relative flex gap-0">
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-teal-500 border-4 border-white shadow mt-1" />
                  </div>
                  <div className="ml-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{corr.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{corr.relatedHistory}</p>
                    <p className="text-gray-700 leading-relaxed">{corr.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recommendations ── */}
      {insights.evidenceBasedRecommendations.length > 0 && (
        <div className="gradient-dark px-6 sm:px-10 py-10 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Recommended Next Steps</h2>
          <div className="space-y-4">
            {insights.evidenceBasedRecommendations.map((rec: DetailedRecommendation, idx: number) => {
              const urgency = getUrgencyBadge(rec.priority);
              const isExpanded = expandedRecs.has(idx);
              return (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-sm font-bold">{idx + 1}</span>
                      </div>
                      <h3 className="text-white font-semibold">{rec.title}</h3>
                    </div>
                    <Badge color={urgency.color}>{urgency.label}</Badge>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed ml-11 mb-3">{rec.description}</p>

                  {/* Toggle details */}
                  <div className="ml-11">
                    <button
                      type="button"
                      onClick={() => toggleRec(idx)}
                      className="text-teal-300 hover:text-teal-200 text-sm font-medium transition-colors mb-3"
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details'}
                    </button>

                    {isExpanded && (
                      <div className="space-y-4 fade-in">
                        {rec.actionSteps && rec.actionSteps.length > 0 && (
                          <div className="space-y-2">
                            {rec.actionSteps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="w-5 h-5 rounded-full bg-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {step}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Timeline: {rec.timeline}</span>
                          <span>Est. Cost: {rec.costEstimate}</span>
                          {rec.availability?.telehealth && (
                            <span className="text-teal-300">Telehealth available</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={creatingPlanIdx === idx}
                          onClick={async () => {
                            try {
                              setCreatingPlanIdx(idx);
                              const plan = await createStructuredPlan(rec);
                              if (plan?.id) {
                                toast({ title: 'Structured Plan Created', description: 'Opening plan in new tab...' });
                                window.open(`/insights/plan/${plan.id}`, '_blank');
                              } else {
                                throw new Error('Invalid response');
                              }
                            } catch {
                              toast({ title: 'Error', description: 'Failed to create plan. Please try again.', variant: 'destructive' });
                            } finally {
                              setCreatingPlanIdx(null);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingPlanIdx === idx ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Creating Plan...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Create Structured Plan
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Creating plan overlay */}
          {creatingPlanIdx !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-xl">
                <svg className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Structured Plan</h3>
                <p className="text-sm text-gray-500">
                  We are creating a detailed structured plan for you.
                  <br />
                  Please hold on, this might take up to a minute.
                  <br />
                  Once generated, it will open in a new tab.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Strategic Roadmap ── */}
      {insights.strategicRoadmap && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Roadmap</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Short-term */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Short-term</h3>
                  <p className="text-xs text-gray-500">0-3 months</p>
                </div>
              </div>
              <div className="space-y-3">
                {(insights.strategicRoadmap.shortTerm || []).map((item, idx) => (
                  <div key={idx} className="border-l-2 border-teal-400 pl-3">
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medium-term */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Medium-term</h3>
                  <p className="text-xs text-gray-500">3-6 months</p>
                </div>
              </div>
              <div className="space-y-3">
                {(insights.strategicRoadmap.mediumTerm || []).map((item, idx) => (
                  <div key={idx} className="border-l-2 border-amber-400 pl-3">
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Long-term */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Long-term</h3>
                  <p className="text-xs text-gray-500">6-12 months</p>
                </div>
              </div>
              <div className="space-y-3">
                {(insights.strategicRoadmap.longTerm || []).map((item, idx) => (
                  <div key={idx} className="border-l-2 border-purple-400 pl-3">
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Case Analysis Fallback ── */}
      {!insights.overallAssessment && insights.caseAnalysis && (
        <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-teal-400 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Case Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {insights.caseAnalysis.age && (
              <div>
                <span className="font-medium text-gray-500">Age:</span>{' '}
                <span className="text-gray-900">{insights.caseAnalysis.age}</span>
              </div>
            )}
            {insights.caseAnalysis.diagnosis.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Diagnosis:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {insights.caseAnalysis.diagnosis.map(d => <Badge key={d} color="purple">{d}</Badge>)}
                </div>
              </div>
            )}
            {insights.caseAnalysis.challenges.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Challenges:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {insights.caseAnalysis.challenges.map(c => <Badge key={c} color="yellow">{c}</Badge>)}
                </div>
              </div>
            )}
            {insights.caseAnalysis.interventions.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Interventions:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {insights.caseAnalysis.interventions.map(i => <Badge key={i} color="blue">{i}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
