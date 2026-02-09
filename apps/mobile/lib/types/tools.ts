export interface Assessment {
  id: string;
  childId: string;
  status: string;
  tier1CompletedAt: string | null;
  tier2CompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsage {
  totalRequests: number;
  requestsToday: number;
  dailyLimit: number;
  remainingToday: number;
}

export interface AiSummaryResult {
  summary: string;
}

export interface AiInsightsResult {
  insights: string[];
}

export interface AiResourceSuggestion {
  title: string;
  description: string;
  url?: string;
}
