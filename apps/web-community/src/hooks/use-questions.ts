import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  getQuestions,
  getQuestion,
  createQuestion,
  deleteQuestion,
  toggleFollowQuestion,
  getQuestionsStats,
  getAnswers,
  createAnswer,
  voteAnswer,
  acceptAnswer,
  type QuestionFilters,
  type CreateQuestionDto,
} from '@/lib/api/questions';

const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters?: QuestionFilters) => [...questionKeys.lists(), filters] as const,
  detail: (id: string) => [...questionKeys.all, 'detail', id] as const,
  stats: () => [...questionKeys.all, 'stats'] as const,
  answers: (id: string, sort?: string) => [...questionKeys.detail(id), 'answers', sort] as const,
};

export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: questionKeys.list(filters),
    queryFn: () => getQuestions(filters),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => getQuestion(id),
    enabled: !!id,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuestionDto) => createQuestion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      toast({ title: 'Question posted', description: 'Your question has been submitted.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to post question.', variant: 'destructive' });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    },
  });
}

export function useToggleFollowQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleFollowQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
}

export function useQuestionsStats() {
  return useQuery({
    queryKey: questionKeys.stats(),
    queryFn: getQuestionsStats,
  });
}

export function useAnswers(questionId: string, sort?: 'best' | 'recent' | 'oldest') {
  return useQuery({
    queryKey: questionKeys.answers(questionId, sort),
    queryFn: () => getAnswers(questionId, sort),
    enabled: !!questionId,
  });
}

export function useCreateAnswer(questionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createAnswer(questionId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.answers(questionId) });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) });
      toast({ title: 'Answer posted' });
    },
  });
}

export function useVoteAnswer() {
  return useMutation({
    mutationFn: ({ answerId, vote }: { answerId: string; vote: 'up' | 'down' | null }) => voteAnswer(answerId, vote),
  });
}

export function useAcceptAnswer(questionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answerId: string) => acceptAnswer(questionId, answerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) });
      queryClient.invalidateQueries({ queryKey: questionKeys.answers(questionId) });
    },
  });
}
