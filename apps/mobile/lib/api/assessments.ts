import api from '../api';
import { Assessment, Questionnaire, QuestionResponse, AssessmentReport } from '../types/assessments';

export async function createAssessment(childId: string): Promise<Assessment> {
  const { data } = await api.post('/assessments', { childId });
  return data;
}

export async function getAssessment(id: string): Promise<Assessment> {
  const { data } = await api.get(`/assessments/${id}`);
  return data;
}

export async function getChildAssessments(childId: string): Promise<Assessment[]> {
  const { data } = await api.get(`/assessments/child/${childId}`);
  return data;
}

export async function getTier1Questionnaire(id: string): Promise<Questionnaire> {
  const { data } = await api.get(`/assessments/${id}/questionnaire/tier1`);
  return data;
}

export async function getTier2Questionnaire(id: string): Promise<Questionnaire> {
  const { data } = await api.get(`/assessments/${id}/questionnaire/tier2`);
  return data;
}

export async function submitTier1Responses(id: string, responses: QuestionResponse[]): Promise<Assessment> {
  const { data } = await api.post(`/assessments/${id}/responses/tier1`, { responses });
  return data;
}

export async function submitTier2Responses(id: string, responses: QuestionResponse[]): Promise<Assessment> {
  const { data } = await api.post(`/assessments/${id}/responses/tier2`, { responses });
  return data;
}

export async function getReport(id: string): Promise<AssessmentReport> {
  const { data } = await api.get(`/assessments/${id}/report-v2`);
  return data;
}
