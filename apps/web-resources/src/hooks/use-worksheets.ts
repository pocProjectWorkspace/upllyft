import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  generateWorksheet,
  getMyLibrary,
  getWorksheet,
  getWorksheetStatus,
  updateWorksheet,
  deleteWorksheet,
  regenerateSection,
  regenerateImage,
  getChildScreenings,
  getScreeningSummary,
  parseReport,
  getIEPGoals,
  getSessionNotes,
  assignWorksheet,
  getSentAssignments,
  getReceivedAssignments,
  getAssignment,
  updateAssignment,
  browseCommunity,
  publishWorksheet,
  unpublishWorksheet,
  cloneWorksheet,
  createReview,
  getReviews,
  deleteReview,
  markReviewHelpful,
  flagWorksheet,
  getModerationQueue,
  resolveFlag,
  getModerationStats,
  recordCompletion,
  getCompletionStats,
  getChildProgressTimeline,
  getChildJourney,
  getWorksheetEffectiveness,
  getRecommendations,
  suggestDifficulty,
  createVersion,
  getVersionHistory,
  getTopContributors,
  applyForVerification,
  approveVerification,
  linkWorksheetToCase,
  getCaseWorksheets,
  type WorksheetFilters,
  type CommunityFilters,
  type AssignmentFilters,
  type FlagFilters,
  type GenerateWorksheetInput,
  type AssignWorksheetDto,
  type RecordCompletionDto,
  type WorksheetFlagReason,
  type WorksheetFlagStatus,
  type WorksheetAssignmentStatus,
  type WorksheetStatus,
} from '@/lib/api/worksheets';

const keys = {
  all: ['worksheets'] as const,
  library: (filters?: WorksheetFilters) => [...keys.all, 'library', filters] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  status: (id: string) => [...keys.all, 'status', id] as const,
  community: (filters?: CommunityFilters) => [...keys.all, 'community', filters] as const,
  sentAssignments: (filters?: AssignmentFilters) => [...keys.all, 'sent-assignments', filters] as const,
  receivedAssignments: (filters?: AssignmentFilters) => [...keys.all, 'received-assignments', filters] as const,
  assignment: (id: string) => [...keys.all, 'assignment', id] as const,
  reviews: (worksheetId: string, page?: number) => [...keys.all, 'reviews', worksheetId, page] as const,
  modQueue: (filters?: FlagFilters) => [...keys.all, 'mod-queue', filters] as const,
  modStats: () => [...keys.all, 'mod-stats'] as const,
  childScreenings: (childId: string) => [...keys.all, 'child-screenings', childId] as const,
  screeningSummary: (assessmentId: string) => [...keys.all, 'screening-summary', assessmentId] as const,
  iepGoals: (caseId: string) => [...keys.all, 'iep-goals', caseId] as const,
  sessionNotes: (caseId: string) => [...keys.all, 'session-notes', caseId] as const,
  completionStats: (childId: string) => [...keys.all, 'completion-stats', childId] as const,
  progressTimeline: (childId: string) => [...keys.all, 'progress-timeline', childId] as const,
  childJourney: (childId: string) => [...keys.all, 'child-journey', childId] as const,
  effectiveness: (worksheetId: string) => [...keys.all, 'effectiveness', worksheetId] as const,
  recommendations: (childId: string) => [...keys.all, 'recommendations', childId] as const,
  difficultySuggestion: (childId: string) => [...keys.all, 'difficulty-suggestion', childId] as const,
  versions: (worksheetId: string) => [...keys.all, 'versions', worksheetId] as const,
  topContributors: () => [...keys.all, 'top-contributors'] as const,
  caseWorksheets: (caseId: string) => [...keys.all, 'case-worksheets', caseId] as const,
};

// ── Core CRUD ──

export function useMyLibrary(filters?: WorksheetFilters) {
  return useQuery({
    queryKey: keys.library(filters),
    queryFn: () => getMyLibrary(filters),
  });
}

export function useWorksheet(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => getWorksheet(id),
    enabled: !!id,
  });
}

export function useWorksheetStatus(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.status(id),
    queryFn: () => getWorksheetStatus(id),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'GENERATING' ? 3000 : false;
    },
  });
}

export function useGenerateWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateWorksheetInput) => generateWorksheet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.library() });
      toast({ title: 'Worksheet generation started' });
    },
    onError: () => toast({ title: 'Failed to generate worksheet', variant: 'destructive' }),
  });
}

export function useUpdateWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: Record<string, unknown>; conditionTags?: string[] } }) =>
      updateWorksheet(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.library() });
      toast({ title: 'Worksheet updated' });
    },
    onError: () => toast({ title: 'Failed to update worksheet', variant: 'destructive' }),
  });
}

export function useDeleteWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorksheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.library() });
      toast({ title: 'Worksheet deleted' });
    },
    onError: () => toast({ title: 'Failed to delete worksheet', variant: 'destructive' }),
  });
}

export function useRegenerateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: { sectionId: string; instructions: string } }) =>
      regenerateSection(worksheetId, data),
    onSuccess: (worksheet) => {
      qc.invalidateQueries({ queryKey: keys.detail(worksheet.id) });
      toast({ title: 'Section regenerated' });
    },
    onError: () => toast({ title: 'Failed to regenerate section', variant: 'destructive' }),
  });
}

export function useRegenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: { imageId: string; customPrompt?: string } }) =>
      regenerateImage(worksheetId, data),
    onSuccess: (_, { worksheetId }) => {
      qc.invalidateQueries({ queryKey: keys.detail(worksheetId) });
      toast({ title: 'Image regeneration started' });
    },
    onError: () => toast({ title: 'Failed to regenerate image', variant: 'destructive' }),
  });
}

// ── Data Sources ──

export function useChildScreenings(childId: string) {
  return useQuery({
    queryKey: keys.childScreenings(childId),
    queryFn: () => getChildScreenings(childId),
    enabled: !!childId,
  });
}

export function useScreeningSummary(assessmentId: string) {
  return useQuery({
    queryKey: keys.screeningSummary(assessmentId),
    queryFn: () => getScreeningSummary(assessmentId),
    enabled: !!assessmentId,
  });
}

export function useParseReport() {
  return useMutation({
    mutationFn: ({ reportUrl, fileType }: { reportUrl: string; fileType: string }) =>
      parseReport(reportUrl, fileType),
    onError: () => toast({ title: 'Failed to parse report', variant: 'destructive' }),
  });
}

export function useIEPGoals(caseId: string) {
  return useQuery({
    queryKey: keys.iepGoals(caseId),
    queryFn: () => getIEPGoals(caseId),
    enabled: !!caseId,
  });
}

export function useSessionNotes(caseId: string) {
  return useQuery({
    queryKey: keys.sessionNotes(caseId),
    queryFn: () => getSessionNotes(caseId),
    enabled: !!caseId,
  });
}

// ── Assignments ──

export function useAssignWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: AssignWorksheetDto }) =>
      assignWorksheet(worksheetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sentAssignments() });
      toast({ title: 'Worksheet assigned successfully' });
    },
    onError: () => toast({ title: 'Failed to assign worksheet', variant: 'destructive' }),
  });
}

export function useSentAssignments(filters?: AssignmentFilters) {
  return useQuery({
    queryKey: keys.sentAssignments(filters),
    queryFn: () => getSentAssignments(filters),
  });
}

export function useReceivedAssignments(filters?: AssignmentFilters) {
  return useQuery({
    queryKey: keys.receivedAssignments(filters),
    queryFn: () => getReceivedAssignments(filters),
  });
}

export function useAssignment(assignmentId: string) {
  return useQuery({
    queryKey: keys.assignment(assignmentId),
    queryFn: () => getAssignment(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: { status?: WorksheetAssignmentStatus; parentNotes?: string } }) =>
      updateAssignment(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      qc.invalidateQueries({ queryKey: keys.assignment(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.receivedAssignments() });
      qc.invalidateQueries({ queryKey: keys.sentAssignments() });
      toast({ title: 'Assignment updated' });
    },
    onError: () => toast({ title: 'Failed to update assignment', variant: 'destructive' }),
  });
}

// ── Community ──

export function useBrowseCommunity(filters?: CommunityFilters) {
  return useQuery({
    queryKey: keys.community(filters),
    queryFn: () => browseCommunity(filters),
  });
}

export function usePublishWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, contributorNotes }: { worksheetId: string; contributorNotes?: string }) =>
      publishWorksheet(worksheetId, contributorNotes),
    onSuccess: (worksheet) => {
      qc.invalidateQueries({ queryKey: keys.detail(worksheet.id) });
      qc.invalidateQueries({ queryKey: keys.library() });
      qc.invalidateQueries({ queryKey: keys.community() });
      toast({ title: 'Worksheet published to community' });
    },
    onError: () => toast({ title: 'Failed to publish worksheet', variant: 'destructive' }),
  });
}

export function useUnpublishWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (worksheetId: string) => unpublishWorksheet(worksheetId),
    onSuccess: (worksheet) => {
      qc.invalidateQueries({ queryKey: keys.detail(worksheet.id) });
      qc.invalidateQueries({ queryKey: keys.library() });
      qc.invalidateQueries({ queryKey: keys.community() });
      toast({ title: 'Worksheet unpublished' });
    },
    onError: () => toast({ title: 'Failed to unpublish worksheet', variant: 'destructive' }),
  });
}

export function useCloneWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (worksheetId: string) => cloneWorksheet(worksheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.library() });
      toast({ title: 'Worksheet cloned to your library' });
    },
    onError: () => toast({ title: 'Failed to clone worksheet', variant: 'destructive' }),
  });
}

// ── Reviews ──

export function useReviews(worksheetId: string, page = 1) {
  return useQuery({
    queryKey: keys.reviews(worksheetId, page),
    queryFn: () => getReviews(worksheetId, { page }),
    enabled: !!worksheetId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: { rating: number; reviewText?: string } }) =>
      createReview(worksheetId, data),
    onSuccess: (_, { worksheetId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews(worksheetId) });
      qc.invalidateQueries({ queryKey: keys.detail(worksheetId) });
      toast({ title: 'Review submitted' });
    },
    onError: () => toast({ title: 'Failed to submit review', variant: 'destructive' }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, reviewId }: { worksheetId: string; reviewId: string }) =>
      deleteReview(worksheetId, reviewId),
    onSuccess: (_, { worksheetId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews(worksheetId) });
      qc.invalidateQueries({ queryKey: keys.detail(worksheetId) });
      toast({ title: 'Review deleted' });
    },
    onError: () => toast({ title: 'Failed to delete review', variant: 'destructive' }),
  });
}

export function useMarkReviewHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, reviewId }: { worksheetId: string; reviewId: string }) =>
      markReviewHelpful(worksheetId, reviewId),
    onSuccess: (_, { worksheetId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews(worksheetId) });
    },
  });
}

// ── Moderation ──

export function useModerationQueue(filters?: FlagFilters) {
  return useQuery({
    queryKey: keys.modQueue(filters),
    queryFn: () => getModerationQueue(filters),
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: keys.modStats(),
    queryFn: getModerationStats,
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, data }: { flagId: string; data: { status: WorksheetFlagStatus; resolution?: string } }) =>
      resolveFlag(flagId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.modQueue() });
      qc.invalidateQueries({ queryKey: keys.modStats() });
      toast({ title: 'Flag resolved' });
    },
    onError: () => toast({ title: 'Failed to resolve flag', variant: 'destructive' }),
  });
}

export function useFlagWorksheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: { reason: WorksheetFlagReason; details?: string } }) =>
      flagWorksheet(worksheetId, data),
    onSuccess: () => {
      toast({ title: 'Worksheet flagged for review' });
    },
    onError: () => toast({ title: 'Failed to flag worksheet', variant: 'destructive' }),
  });
}

// ── Completions & Analytics ──

export function useRecordCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, data }: { worksheetId: string; data: RecordCompletionDto }) =>
      recordCompletion(worksheetId, data),
    onSuccess: (_, { data }) => {
      qc.invalidateQueries({ queryKey: keys.completionStats(data.childId) });
      qc.invalidateQueries({ queryKey: keys.progressTimeline(data.childId) });
      qc.invalidateQueries({ queryKey: keys.receivedAssignments() });
      toast({ title: 'Completion recorded' });
    },
    onError: () => toast({ title: 'Failed to record completion', variant: 'destructive' }),
  });
}

export function useCompletionStats(childId: string) {
  return useQuery({
    queryKey: keys.completionStats(childId),
    queryFn: () => getCompletionStats(childId),
    enabled: !!childId,
  });
}

export function useChildProgressTimeline(childId: string) {
  return useQuery({
    queryKey: keys.progressTimeline(childId),
    queryFn: () => getChildProgressTimeline(childId),
    enabled: !!childId,
  });
}

export function useChildJourney(childId: string) {
  return useQuery({
    queryKey: keys.childJourney(childId),
    queryFn: () => getChildJourney(childId),
    enabled: !!childId,
  });
}

export function useWorksheetEffectiveness(worksheetId: string) {
  return useQuery({
    queryKey: keys.effectiveness(worksheetId),
    queryFn: () => getWorksheetEffectiveness(worksheetId),
    enabled: !!worksheetId,
  });
}

// ── Recommendations ──

export function useRecommendations(childId: string) {
  return useQuery({
    queryKey: keys.recommendations(childId),
    queryFn: () => getRecommendations(childId),
    enabled: !!childId,
  });
}

export function useSuggestDifficulty(childId: string) {
  return useQuery({
    queryKey: keys.difficultySuggestion(childId),
    queryFn: () => suggestDifficulty(childId),
    enabled: !!childId,
  });
}

// ── Version Tracking ──

export function useCreateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (worksheetId: string) => createVersion(worksheetId),
    onSuccess: (_, worksheetId) => {
      qc.invalidateQueries({ queryKey: keys.versions(worksheetId) });
      qc.invalidateQueries({ queryKey: keys.detail(worksheetId) });
      toast({ title: 'New version created' });
    },
    onError: () => toast({ title: 'Failed to create version', variant: 'destructive' }),
  });
}

export function useVersionHistory(worksheetId: string) {
  return useQuery({
    queryKey: keys.versions(worksheetId),
    queryFn: () => getVersionHistory(worksheetId),
    enabled: !!worksheetId,
  });
}

// ── Contributors ──

export function useTopContributors() {
  return useQuery({
    queryKey: keys.topContributors(),
    queryFn: getTopContributors,
  });
}

export function useApplyForVerification() {
  return useMutation({
    mutationFn: (bio: string) => applyForVerification(bio),
    onSuccess: () => toast({ title: 'Verification application submitted' }),
    onError: () => toast({ title: 'Failed to submit application', variant: 'destructive' }),
  });
}

export function useApproveVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveVerification(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.topContributors() });
      toast({ title: 'Contributor verified' });
    },
    onError: () => toast({ title: 'Failed to verify contributor', variant: 'destructive' }),
  });
}

// ── Case Integration ──

export function useLinkWorksheetToCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ worksheetId, caseId }: { worksheetId: string; caseId: string }) =>
      linkWorksheetToCase(worksheetId, caseId),
    onSuccess: (worksheet) => {
      qc.invalidateQueries({ queryKey: keys.detail(worksheet.id) });
      toast({ title: 'Worksheet linked to case' });
    },
    onError: () => toast({ title: 'Failed to link to case', variant: 'destructive' }),
  });
}

export function useCaseWorksheets(caseId: string) {
  return useQuery({
    queryKey: keys.caseWorksheets(caseId),
    queryFn: () => getCaseWorksheets(caseId),
    enabled: !!caseId,
  });
}
