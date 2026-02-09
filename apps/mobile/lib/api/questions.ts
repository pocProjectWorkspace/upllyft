import api from '../api';
import { Question, Answer } from '../types/questions';

export interface QuestionsResponse {
  questions: Question[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export async function getQuestions(page = 1, limit = 15): Promise<QuestionsResponse> {
  const { data } = await api.get('/questions', { params: { page, limit } });
  return data;
}

export async function getQuestion(id: string): Promise<Question> {
  const { data } = await api.get(`/questions/${id}`);
  return data;
}

export async function createQuestion(title: string, content: string, tags?: string[], category?: string): Promise<Question> {
  const { data } = await api.post('/questions', { title, content, tags, category });
  return data;
}

export async function followQuestion(id: string): Promise<void> {
  await api.post(`/questions/${id}/follow`);
}

export async function getAnswers(questionId: string): Promise<Answer[]> {
  const { data } = await api.get(`/answers/question/${questionId}`);
  return Array.isArray(data) ? data : data.answers ?? [];
}

export async function createAnswer(questionId: string, content: string): Promise<Answer> {
  const { data } = await api.post('/answers', { questionId, content });
  return data;
}

export async function voteAnswer(id: string, value: 1 | -1): Promise<void> {
  await api.post(`/answers/${id}/vote`, { value });
}

export async function acceptAnswer(id: string): Promise<void> {
  await api.post('/answers/accept', { answerId: id });
}
