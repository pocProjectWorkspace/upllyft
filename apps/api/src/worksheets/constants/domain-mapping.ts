/**
 * Maps UFMF Assessment domain keys to Worksheet developmental domains.
 * Assessment domainScores JSON uses keys like "grossMotor", "fineMotor", etc.
 * Worksheet targetDomains use the DEVELOPMENTAL_DOMAINS keys.
 */
export const ASSESSMENT_TO_WORKSHEET_DOMAIN: Record<string, string> = {
  grossMotor: 'MOTOR',
  fineMotor: 'MOTOR',
  speechLanguage: 'LANGUAGE',
  socialEmotional: 'SOCIAL',
  cognitiveLearning: 'COGNITIVE',
  sensoryProcessing: 'SENSORY',
  visionHearing: 'SENSORY',
  adaptiveSelfCare: 'ADAPTIVE',
};

/**
 * Given an Assessment's domainScores JSON, return an array of unique
 * worksheet domain keys for domains that are flagged/low-scoring.
 */
export function mapFlaggedDomainsToWorksheetDomains(
  flaggedDomains: string[],
): string[] {
  const mapped = new Set<string>();
  for (const domain of flaggedDomains) {
    const worksheetDomain = ASSESSMENT_TO_WORKSHEET_DOMAIN[domain];
    if (worksheetDomain) {
      mapped.add(worksheetDomain);
    }
  }
  return Array.from(mapped);
}

/**
 * Extract domain scores from Assessment JSON and normalize into
 * a structured format for AI prompt consumption.
 */
export interface DomainScoreSummary {
  domain: string;
  worksheetDomain: string;
  score: number;
  maxScore: number;
  percentile?: number;
  flagged: boolean;
}

export function extractDomainScoreSummaries(
  domainScores: Record<string, any>,
  flaggedDomains: string[],
): DomainScoreSummary[] {
  const summaries: DomainScoreSummary[] = [];

  for (const [domain, data] of Object.entries(domainScores)) {
    const worksheetDomain = ASSESSMENT_TO_WORKSHEET_DOMAIN[domain];
    if (!worksheetDomain) continue;

    summaries.push({
      domain,
      worksheetDomain,
      score: typeof data === 'object' ? data.score ?? data.total ?? 0 : Number(data) || 0,
      maxScore: typeof data === 'object' ? data.maxScore ?? data.max ?? 100 : 100,
      percentile: typeof data === 'object' ? data.percentile : undefined,
      flagged: flaggedDomains.includes(domain),
    });
  }

  return summaries;
}
