'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Skeleton, Textarea } from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useUserChildren,
  useChildAssessments,
  useAnalyzeAssessment,
} from '@/hooks/use-assessments';
import { formatDate, formatAge } from '@/lib/utils';
import type { Child, Assessment } from '@/lib/api/assessments';

const STEPS = ['Select Child', 'Select Assessment', 'Add Context', 'Generate'];

const FOCUS_AREAS = [
  { id: 'developmental', label: 'Developmental Milestones' },
  { id: 'behavioral', label: 'Behavioral Patterns' },
  { id: 'educational', label: 'Educational Readiness' },
  { id: 'sensory', label: 'Sensory Processing' },
];

const PROGRESS_MESSAGES = [
  'Analyzing screening responses...',
  'Reviewing developmental history...',
  'Correlating clinical patterns...',
  'Generating comprehensive insight...',
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((label, idx) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                idx < currentStep
                  ? 'bg-teal-500 text-white'
                  : idx === currentStep
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span className={`text-xs mt-1.5 whitespace-nowrap ${idx <= currentStep ? 'text-teal-700 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-5 ${idx < currentStep ? 'bg-teal-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewInsightPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [context, setContext] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [progressIdx, setProgressIdx] = useState(0);

  const { data: children, isLoading: childrenLoading } = useUserChildren();
  const { data: assessments, isLoading: assessmentsLoading } = useChildAssessments(
    selectedChild?.id || '',
  );
  const analyzeMutation = useAnalyzeAssessment();

  // Completed assessments only
  const completedAssessments = (assessments || []).filter(
    (a) => a.status === 'COMPLETED' || a.status === 'TIER1_COMPLETE',
  );

  // Progress animation
  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  function handleGenerate() {
    if (!selectedChild || !selectedAssessment) return;
    setStep(3);
    analyzeMutation.mutate(
      {
        childId: selectedChild.id,
        assessmentId: selectedAssessment.id,
        context: context.trim() || undefined,
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      },
      {
        onSuccess: (result) => {
          router.push(`/insights/${result.conversationId}`);
        },
        onError: () => {
          setStep(2);
        },
      },
    );
  }

  function toggleFocus(id: string) {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  return (
    <ScreeningShell>
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Insights
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">New Analysis</h1>
        <p className="text-gray-500 mb-8">Generate an AI-powered developmental insight from a completed screening.</p>

        <StepIndicator currentStep={step} />

        {/* ── Step 1: Select Child ── */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a child</h2>
            {childrenLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <Skeleton className="h-12 w-12 rounded-full mb-3" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !children || children.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <p className="text-gray-500 mb-4">No children found. Please add a child to your profile first.</p>
                <a href="http://localhost:3000/profile">
                  <Button variant="outline">Go to Profile</Button>
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child: Child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChild(child);
                      setSelectedAssessment(null);
                      setStep(1);
                    }}
                    className={`text-left bg-white rounded-2xl border-2 p-5 transition-all card-hover ${
                      selectedChild?.id === child.id
                        ? 'border-teal-500 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                      <span className="text-teal-700 font-bold text-lg">
                        {child.firstName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {child.nickname || child.firstName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatAge(child.dateOfBirth)} &middot; {child.gender}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Select Assessment ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Select an assessment for {selectedChild?.nickname || selectedChild?.firstName}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Choose a completed screening to analyze.</p>

            {assessmentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <Skeleton className="h-5 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : completedAssessments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <p className="text-gray-500 mb-4">
                  No completed assessments found for this child. Complete a screening first.
                </p>
                <Button variant="outline" onClick={() => setStep(0)}>
                  Select Another Child
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {completedAssessments.map((assessment) => (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssessment(assessment);
                      setStep(2);
                    }}
                    className={`w-full text-left bg-white rounded-2xl border-2 p-5 transition-all card-hover ${
                      selectedAssessment?.id === assessment.id
                        ? 'border-teal-500 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Screening &mdash; {assessment.ageGroup?.replace(/-/g, ' ')}
                      </h3>
                      {assessment.overallScore != null && (
                        <span className={`text-sm font-bold ${
                          assessment.overallScore >= 70
                            ? 'text-green-600'
                            : assessment.overallScore >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}>
                          {Math.round(assessment.overallScore)}% overall
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {assessment.completedAt
                          ? formatDate(assessment.completedAt)
                          : formatDate(assessment.createdAt)}
                      </span>
                      {assessment.flaggedDomains && assessment.flaggedDomains.length > 0 && (
                        <span className="text-amber-600">
                          {assessment.flaggedDomains.length} domain{assessment.flaggedDomains.length > 1 ? 's' : ''} flagged
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              <Button variant="ghost" onClick={() => setStep(0)} className="text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Add Context ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Additional context <span className="text-gray-400 font-normal text-sm">(optional)</span>
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Share any additional concerns or observations to help generate a more relevant analysis.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concerns or observations
              </label>
              <Textarea
                placeholder="E.g., Recently started school and teacher mentioned difficulty sitting still during circle time. Also seems sensitive to loud sounds..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Focus areas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleFocus(area.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      focusAreas.includes(area.id)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      focusAreas.includes(area.id)
                        ? 'bg-teal-500'
                        : 'border-2 border-gray-300'
                    }`}>
                      {focusAreas.includes(area.id) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{area.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                className="gradient-teal text-white border-0 px-8 py-3 rounded-xl font-semibold"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Insight
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Generating ── */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-8" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Insight</h2>
            <p className="text-gray-500 text-sm mb-4 transition-opacity duration-500">
              {PROGRESS_MESSAGES[progressIdx]}
            </p>
            <p className="text-xs text-gray-400">This may take 30-60 seconds</p>
          </div>
        )}
      </div>
    </ScreeningShell>
  );
}
