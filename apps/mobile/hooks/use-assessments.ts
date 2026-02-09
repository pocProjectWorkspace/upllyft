import { useState, useEffect, useCallback } from 'react';
import { Assessment, Questionnaire, QuestionResponse, AssessmentReport, AnswerType } from '../lib/types/assessments';
import {
  getAssessment,
  getTier1Questionnaire,
  getTier2Questionnaire,
  submitTier1Responses,
  submitTier2Responses,
  getReport,
} from '../lib/api/assessments';

export function useAssessmentFlow(assessmentId: string) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerType>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<1 | 2>(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const a = await getAssessment(assessmentId);
      setAssessment(a);
      if (!a.tier1CompletedAt) {
        const q = await getTier1Questionnaire(assessmentId);
        setQuestionnaire(q);
        setTier(1);
      } else if (!a.tier2CompletedAt && a.flaggedDomains?.length) {
        const q = await getTier2Questionnaire(assessmentId);
        setQuestionnaire(q);
        setTier(2);
      }
    } catch {
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { load(); }, [load]);

  const answerQuestion = (questionId: string, answer: AnswerType) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (questionnaire && currentIndex < questionnaire.questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const submit = async () => {
    if (!questionnaire) return;
    setSubmitting(true);
    setError(null);
    try {
      const responses: QuestionResponse[] = questionnaire.questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || 'NO',
      }));
      const updated = tier === 1
        ? await submitTier1Responses(assessmentId, responses)
        : await submitTier2Responses(assessmentId, responses);
      setAssessment(updated);
      return updated;
    } catch {
      setError('Failed to submit responses');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questionnaire?.questions[currentIndex] ?? null;
  const totalQuestions = questionnaire?.questions.length ?? 0;
  const allAnswered = questionnaire ? questionnaire.questions.every(q => answers[q.id]) : false;

  return {
    assessment, questionnaire, currentQuestion, currentIndex, totalQuestions,
    answers, tier, loading, submitting, error, allAnswered,
    answerQuestion, nextQuestion, prevQuestion, submit, reload: load,
  };
}

export function useAssessmentReport(assessmentId: string) {
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(assessmentId)
      .then(setReport)
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  return { report, loading, error };
}
