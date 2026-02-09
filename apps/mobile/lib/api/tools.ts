import api from '../api';
import { AiUsage, AiSummaryResult, AiInsightsResult, AiResourceSuggestion } from '../types/tools';

export async function getAiUsage(): Promise<AiUsage> {
  const { data } = await api.get('/ai/usage');
  return data;
}

export async function summarizeContent(content: string): Promise<AiSummaryResult> {
  const { data } = await api.post('/ai/summarize', { content });
  return data;
}

export async function extractInsights(content: string): Promise<AiInsightsResult> {
  const { data } = await api.post('/ai/extract-insights', { content });
  return data;
}

export async function suggestResources(topic: string): Promise<AiResourceSuggestion[]> {
  const { data } = await api.post('/ai/suggest-resources', { topic });
  return data.resources ?? data;
}

export async function suggestTags(title: string, content: string): Promise<string[]> {
  const { data } = await api.post('/ai/suggest-tags', { title, content });
  return data.tags ?? data;
}
