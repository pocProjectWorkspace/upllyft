import api from '../api';
import { ClinicalInsight, ClinicalHistory, ClinicalPlan } from '../types/ai';

export async function analyzeClinicalCase(query: string): Promise<ClinicalInsight> {
  const { data } = await api.post('/agents/clinical-insights/analyze', { query });
  return data.data ?? data;
}

export async function getClinicalHistory(): Promise<ClinicalHistory[]> {
  const { data } = await api.get('/agents/clinical-insights/history');
  return data.data ?? data;
}

export async function getConversation(id: string): Promise<ClinicalInsight> {
  const { data } = await api.get(`/agents/clinical-insights/history/${id}`);
  return data.data ?? data;
}

export async function createPlan(recommendation: any): Promise<ClinicalPlan> {
  const { data } = await api.post('/agents/clinical-insights/action/create-plan', recommendation);
  return data.data ?? data;
}
