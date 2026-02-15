import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  createAssessment,
  getAssessment,
  getChildAssessments,
  deleteAssessment,
  getTier1Questionnaire,
  getTier2Questionnaire,
  submitTier1Responses,
  submitTier2Responses,
  getReportData,
  getReportV2Data,
  shareAssessment,
  getSharedAssessments,
  getMyShareForAssessment,
  addAnnotation,
  searchTherapists,
  getUserProfile,
  type CreateAssessmentDto,
  type QuestionResponse,
  type ShareAssessmentDto,
  type AddAnnotationDto,
  type ReportV2,
} from '@/lib/api/assessments';
import {
  analyzeCase,
  getInsightsHistory,
  getInsightConversation,
  followUp,
  submitFeedback,
} from '@/lib/api/insights';

const assessmentKeys = {
  all: ['assessments'] as const,
  child: (childId: string) => [...assessmentKeys.all, 'child', childId] as const,
  detail: (id: string) => [...assessmentKeys.all, 'detail', id] as const,
  questionnaire: (id: string, tier: number) => [...assessmentKeys.all, 'questionnaire', id, tier] as const,
  report: (id: string) => [...assessmentKeys.all, 'report', id] as const,
  reportV2: (id: string) => [...assessmentKeys.all, 'report-v2', id] as const,
  shared: () => [...assessmentKeys.all, 'shared'] as const,
  myShare: (id: string) => [...assessmentKeys.all, 'my-share', id] as const,
  therapists: (search?: string) => [...assessmentKeys.all, 'therapists', search] as const,
  profile: () => ['profile'] as const,
};

export function useUserChildren() {
  return useQuery({
    queryKey: assessmentKeys.profile(),
    queryFn: async () => {
      const profile = await getUserProfile();
      return profile.children || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useChildAssessments(childId: string) {
  return useQuery({
    queryKey: assessmentKeys.child(childId),
    queryFn: () => getChildAssessments(childId),
    enabled: !!childId,
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => getAssessment(id),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAssessmentDto) => createAssessment(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      toast({ title: 'Screening started', description: 'Your developmental screening has been created.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start screening.', variant: 'destructive' });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      toast({ title: 'Screening deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete screening.', variant: 'destructive' });
    },
  });
}

export function useTier1Questionnaire(id: string) {
  return useQuery({
    queryKey: assessmentKeys.questionnaire(id, 1),
    queryFn: () => getTier1Questionnaire(id),
    enabled: !!id,
  });
}

export function useTier2Questionnaire(id: string) {
  return useQuery({
    queryKey: assessmentKeys.questionnaire(id, 2),
    queryFn: () => getTier2Questionnaire(id),
    enabled: !!id,
  });
}

export function useSubmitTier1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responses }: { id: string; responses: QuestionResponse[] }) =>
      submitTier1Responses(id, { responses }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit responses.', variant: 'destructive' });
    },
  });
}

export function useSubmitTier2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responses }: { id: string; responses: QuestionResponse[] }) =>
      submitTier2Responses(id, { responses }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit responses.', variant: 'destructive' });
    },
  });
}

export function useReportData(id: string) {
  return useQuery({
    queryKey: assessmentKeys.report(id),
    queryFn: () => getReportData(id),
    enabled: !!id,
  });
}

export function useReportV2Data(id: string, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.reportV2(id),
    queryFn: () => getReportV2Data(id),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as ReportV2 | undefined;
      if (data?.status === 'PROCESSING') return 3000;
      return false;
    },
  });
}

export function useShareAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShareAssessmentDto }) =>
      shareAssessment(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      toast({ title: 'Assessment shared', description: 'The therapist can now view this assessment.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to share assessment.', variant: 'destructive' });
    },
  });
}

export function useSharedAssessments() {
  return useQuery({
    queryKey: assessmentKeys.shared(),
    queryFn: getSharedAssessments,
  });
}

export function useMyShare(assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.myShare(assessmentId),
    queryFn: () => getMyShareForAssessment(assessmentId),
    enabled: !!assessmentId,
    staleTime: 30 * 1000,
  });
}

export function useAddAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddAnnotationDto }) =>
      addAnnotation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.myShare(variables.id) });
      toast({ title: 'Annotation added' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add annotation.', variant: 'destructive' });
    },
  });
}

export function useSearchTherapists(search?: string) {
  return useQuery({
    queryKey: assessmentKeys.therapists(search),
    queryFn: () => searchTherapists(search),
    staleTime: 60 * 1000,
  });
}

// ── Insights Hooks ──

const insightKeys = {
  all: ['insights'] as const,
  history: () => [...insightKeys.all, 'history'] as const,
  conversation: (id: string) => [...insightKeys.all, 'conversation', id] as const,
};

export function useInsightsHistory() {
  return useQuery({
    queryKey: insightKeys.history(),
    queryFn: getInsightsHistory,
    staleTime: 60 * 1000,
  });
}

export function useInsightConversation(id: string) {
  return useQuery({
    queryKey: insightKeys.conversation(id),
    queryFn: () => getInsightConversation(id),
    enabled: !!id,
  });
}

export function useAnalyzeCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) => analyzeCase(query),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.history() });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to analyze case.', variant: 'destructive' });
    },
  });
}

export function useFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, query }: { conversationId: string; query: string }) =>
      followUp(conversationId, query),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.conversation(variables.conversationId) });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send follow-up.', variant: 'destructive' });
    },
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: ({ conversationId, value }: { conversationId: string; value: 1 | -1 }) =>
      submitFeedback(conversationId, value),
    onSuccess: () => {
      toast({ title: 'Feedback submitted', description: 'Thank you for your feedback.' });
    },
  });
}
