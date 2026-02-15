'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useAssessment,
  useTier1Questionnaire,
  useTier2Questionnaire,
  useSubmitTier1,
  useSubmitTier2,
} from '@/hooks/use-assessments';
import { domainTitles, domainIcons, getAnswerLabel, formatAgeGroup } from '@/lib/utils';
import type { AnswerType, Domain } from '@/lib/api/assessments';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Label,
  RadioGroup,
  RadioGroupItem,
  Progress,
} from '@upllyft/ui';

const ANSWER_OPTIONS: { value: AnswerType; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { value: 'YES', label: 'Yes', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { value: 'SOMETIMES', label: 'Sometimes', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { value: 'NOT_SURE', label: 'Not Sure', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { value: 'NO', label: 'No', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
];

const LOADING_MESSAGES = [
  'Analyzing responses...',
  'Calculating risk scores...',
  'Generating insights...',
  'Preparing results...',
];

export default function QuestionnairePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const tier = Number(searchParams.get('tier') || '1');

  // ── LocalStorage persistence ──
  const storageKey = `screening-draft-${id}-tier${tier}`;
  const restoredRef = useRef(false);

  const [currentDomainIndex, setCurrentDomainIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.domainIndex || 0;
      }
    } catch { /* ignore */ }
    return 0;
  });

  const [responses, setResponses] = useState<Record<string, AnswerType>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        restoredRef.current = true;
        return parsed.responses || {};
      }
    } catch { /* ignore */ }
    return {};
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // Save progress to localStorage whenever responses or domain changes
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ responses, domainIndex: currentDomainIndex }),
      );
    } catch { /* storage full or unavailable */ }
  }, [responses, currentDomainIndex, storageKey]);

  // Clear storage after successful submission
  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
      // Also clear the other tier's draft since we're moving on
      localStorage.removeItem(`screening-draft-${id}-tier${tier === 1 ? 2 : 1}`);
    } catch { /* ignore */ }
  }

  const { data: assessment, isLoading: assessmentLoading } = useAssessment(id);

  const {
    data: tier1Questionnaire,
    isLoading: tier1Loading,
    isError: tier1Error,
  } = useTier1Questionnaire(id);

  const {
    data: tier2Questionnaire,
    isLoading: tier2Loading,
    isError: tier2Error,
  } = useTier2Questionnaire(id);

  const questionnaire = tier === 2 ? tier2Questionnaire : tier1Questionnaire;
  const isLoading = assessmentLoading || (tier === 2 ? tier2Loading : tier1Loading);
  const isError = tier === 2 ? tier2Error : tier1Error;

  const submitTier1 = useSubmitTier1();
  const submitTier2 = useSubmitTier2();

  // Rotate loading messages during submission
  useEffect(() => {
    if (!isSubmitting) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // Scroll to top when domain changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentDomainIndex]);

  // Reset domain index when tier changes (only if no saved draft)
  useEffect(() => {
    if (!restoredRef.current) {
      setCurrentDomainIndex(0);
    }
    restoredRef.current = false;
  }, [tier]);

  const domains = questionnaire?.domains || [];
  const totalDomains = domains.length;
  const currentDomain: Domain | undefined = domains[currentDomainIndex];
  const progress = totalDomains > 0 ? ((currentDomainIndex + 1) / totalDomains) * 100 : 0;

  const allCurrentDomainAnswered = currentDomain
    ? currentDomain.questions.every((q) => responses[q.id])
    : false;

  const isLastDomain = currentDomainIndex === totalDomains - 1;

  const handleAnswer = useCallback((questionId: string, answer: AnswerType) => {
    setResponses((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentDomainIndex < totalDomains - 1) {
      setCurrentDomainIndex((prev: number) => prev + 1);
    }
  }, [currentDomainIndex, totalDomains]);

  const handlePrevious = useCallback(() => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex((prev: number) => prev - 1);
    }
  }, [currentDomainIndex]);

  const handleSubmit = useCallback(async () => {
    if (!questionnaire) return;

    setIsSubmitting(true);
    setLoadingMessage(LOADING_MESSAGES[0]);

    const responseArray = Object.entries(responses).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      if (tier === 1) {
        const result = await submitTier1.mutateAsync({ id, responses: responseArray });
        clearDraft();
        if (result.tier2Required) {
          setResponses({});
          router.push(`/${id}/questionnaire?tier=2`);
        } else {
          router.push(`/${id}/report`);
        }
      } else {
        await submitTier2.mutateAsync({ id, responses: responseArray });
        clearDraft();
        router.push(`/${id}/report`);
      }
    } catch {
      // Error is handled by the mutation's onError callback
    } finally {
      setIsSubmitting(false);
    }
  }, [questionnaire, responses, tier, id, submitTier1, submitTier2, router]);

  // Loading skeleton
  if (isLoading) {
    return (
      <ScreeningShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Card className="p-6 space-y-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </ScreeningShell>
    );
  }

  // Error state
  if (isError || !questionnaire) {
    return (
      <ScreeningShell>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load questionnaire</h2>
            <p className="text-gray-500 mb-6">
              We could not load the screening questionnaire. Please try again or go back to your screenings.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push('/')}>
                Back to Screenings
              </Button>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </Card>
        </div>
      </ScreeningShell>
    );
  }

  return (
    <ScreeningShell>
      {/* Full-screen loading overlay during submission */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900 transition-all duration-300">
                {loadingMessage}
              </p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tier === 2 ? 'Tier 2 — Detailed Screening' : 'Developmental Screening'}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {assessment?.child && (
                <span className="text-gray-600">
                  {assessment.child.firstName}
                  {assessment.child.nickname ? ` (${assessment.child.nickname})` : ''}
                </span>
              )}
              {questionnaire.ageGroup && (
                <Badge color="teal">{formatAgeGroup(questionnaire.ageGroup)}</Badge>
              )}
              <Badge color={tier === 2 ? 'purple' : 'blue'}>
                Tier {tier}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            {questionnaire.estimatedTime && (
              <p className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {questionnaire.estimatedTime}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">
              Domain {currentDomainIndex + 1} of {totalDomains}
            </span>
            <span className="text-teal-700 font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>

        {/* Domain card */}
        {currentDomain && (
          <Card className="overflow-hidden">
            {/* Domain header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={currentDomain.domainName}>
                  {domainIcons[currentDomain.domainId] || '📋'}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    {domainTitles[currentDomain.domainId] || currentDomain.domainName}
                  </h2>
                  <p className="text-teal-100 text-sm mt-0.5">
                    {currentDomain.description}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Badge color="teal" className="bg-white/20 text-white">
                  {currentDomain.questions.length} question{currentDomain.questions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            {/* Questions list */}
            <div className="divide-y divide-gray-100">
              {currentDomain.questions.map((question, qIndex) => {
                const selectedAnswer = responses[question.id];
                return (
                  <div key={question.id} className="px-6 py-5">
                    {/* Question number and text */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                        {qIndex + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {question.question}
                        </p>

                        {/* Why we ask this */}
                        {question.whyWeAsk && (
                          <details className="mt-2 group">
                            <summary className="text-sm text-teal-600 cursor-pointer hover:text-teal-700 select-none inline-flex items-center gap-1">
                              <svg
                                className="w-4 h-4 transition-transform group-open:rotate-90"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              Why we ask this
                            </summary>
                            <p className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed">
                              {question.whyWeAsk}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>

                    {/* Answer options */}
                    <div className="ml-10">
                      <RadioGroup
                        value={selectedAnswer || ''}
                        onValueChange={(value: string) => handleAnswer(question.id, value as AnswerType)}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                      >
                        {ANSWER_OPTIONS.map((option) => {
                          const isSelected = selectedAnswer === option.value;
                          return (
                            <Label
                              key={option.value}
                              htmlFor={`${question.id}-${option.value}`}
                              className={`
                                flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 cursor-pointer
                                transition-all duration-150
                                ${
                                  isSelected
                                    ? `${option.borderColor} ${option.bgColor} ${option.color} shadow-sm`
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                                }
                              `}
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={`${question.id}-${option.value}`}
                                className={isSelected ? option.color : ''}
                              />
                              <span className="text-sm font-medium">{option.label}</span>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pb-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentDomainIndex === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>

          {isLastDomain ? (
            <Button
              onClick={handleSubmit}
              disabled={!allCurrentDomainAnswered || isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Screening
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!allCurrentDomainAnswered}
            >
              Next
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </ScreeningShell>
  );
}
