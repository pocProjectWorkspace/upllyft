import { apiClient } from '@upllyft/api-client';

export interface QuestionAuthor {
  id: string;
  name: string;
  image?: string;
  role: string;
  verificationStatus: string;
  expertTopics: string[];
  reputation: number;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  slug: string;
  category: string;
  topics: string[];
  tags: string[];
  viewCount: number;
  answerCount: number;
  followerCount: number;
  hasAcceptedAnswer: boolean;
  acceptedAnswerId?: string;
  isAnonymous: boolean;
  anonymousName?: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED' | 'DUPLICATE';
  summary?: string;
  author: QuestionAuthor;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  isFollowing?: boolean;
  isBookmarked?: boolean;
  hasUserAnswered?: boolean;
  isAuthor?: boolean;
  relatedQuestions?: Array<{
    id: string;
    relatedQuestion: {
      id: string;
      title: string;
      answerCount: number;
      hasAcceptedAnswer: boolean;
      viewCount: number;
    };
    similarity: number;
  }>;
}

export interface Answer {
  id: string;
  content: string;
  questionId: string;
  author: QuestionAuthor;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  isAccepted: boolean;
  helpful: boolean;
}

export interface QuestionFilters {
  page?: number;
  limit?: number;
  status?: 'OPEN' | 'CLOSED' | 'MERGED' | 'DUPLICATE';
  category?: string;
  topics?: string[];
  sort?: 'recent' | 'active' | 'popular' | 'unanswered' | 'most-followed';
  hasAcceptedAnswer?: boolean;
  following?: boolean;
  search?: string;
  authorId?: string;
}

export interface QuestionsResponse {
  data: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionsStats {
  total: number;
  answered: number;
  unanswered: number;
}

export interface CreateQuestionDto {
  title: string;
  content: string;
  category: string;
  tags: string[];
  isAnonymous?: boolean;
}

export async function getQuestions(filters?: QuestionFilters): Promise<QuestionsResponse> {
  const { data } = await apiClient.get('/questions', { params: filters });
  return data;
}

export async function getQuestion(id: string): Promise<Question> {
  const { data } = await apiClient.get(`/questions/${id}`);
  return data;
}

export async function createQuestion(dto: CreateQuestionDto): Promise<Question> {
  const { data } = await apiClient.post('/questions', dto);
  return data;
}

export async function updateQuestion(id: string, dto: Partial<CreateQuestionDto>): Promise<Question> {
  const { data } = await apiClient.put(`/questions/${id}`, dto);
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiClient.delete(`/questions/${id}`);
}

export async function closeQuestion(id: string, reason: string): Promise<Question> {
  const { data } = await apiClient.post(`/questions/${id}/close`, { reason });
  return data;
}

export async function toggleFollowQuestion(id: string): Promise<{ following: boolean }> {
  const { data } = await apiClient.post(`/questions/${id}/follow`);
  return data;
}

export async function getQuestionsStats(): Promise<QuestionsStats> {
  const { data } = await apiClient.get('/questions/statistics');
  return data;
}

export async function getAnswers(questionId: string, sort?: 'best' | 'recent' | 'oldest'): Promise<Answer[]> {
  const { data } = await apiClient.get(`/questions/${questionId}/answers`, { params: { sort } });
  return data;
}

export async function createAnswer(questionId: string, content: string): Promise<Answer> {
  const { data } = await apiClient.post(`/questions/${questionId}/answers`, { content });
  return data;
}

export async function voteAnswer(answerId: string, vote: 'up' | 'down' | null): Promise<void> {
  await apiClient.post(`/answers/${answerId}/vote`, { vote });
}

export async function acceptAnswer(questionId: string, answerId: string): Promise<void> {
  await apiClient.post(`/questions/${questionId}/accept/${answerId}`);
}

export async function getFollowedQuestions(page = 1, limit = 20): Promise<QuestionsResponse> {
  const { data } = await apiClient.get('/questions', { params: { page, limit, following: true } });
  return data;
}
