import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { WorksheetStatus, WorksheetDifficulty, Prisma } from '@prisma/client';

export interface RecommendedWorksheet {
  worksheetId: string;
  title: string;
  type: string;
  subType: string;
  difficulty: string;
  targetDomains: string[];
  averageRating: number | null;
  reviewCount: number;
  relevanceScore: number;
  reasoning: string;
}

export interface DifficultyRecommendation {
  suggested: string;
  reasoning: string;
  recentPerformance: {
    avgDifficultyRating: number | null;
    avgEngagement: number | null;
    dominantQuality: string | null;
    completionCount: number;
  };
}

@Injectable()
export class WorksheetRecommendationService {
  private readonly logger = new Logger(WorksheetRecommendationService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = this.configService.get<string>(
      'ANTHROPIC_MODEL',
      'claude-sonnet-4-20250514',
    );
  }

  /**
   * Generate AI-powered worksheet recommendations for a child.
   * Considers: child profile, assessments, IEP goals, completion history, community library.
   */
  async recommendForChild(childId: string, limit = 10): Promise<{
    child: { id: string; firstName: string };
    recommendations: RecommendedWorksheet[];
    difficultyRecommendation: DifficultyRecommendation;
  }> {
    // 1. Load child profile
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        conditions: true,
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
        cases: {
          where: { status: 'ACTIVE' },
          include: {
            ieps: {
              where: { status: 'ACTIVE' },
              include: {
                goals: {
                  where: { status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
                },
              },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!child) throw new NotFoundException('Child not found');

    // 2. Load completion history
    const recentCompletions = await this.prisma.worksheetCompletion.findMany({
      where: { childId },
      include: {
        worksheet: {
          select: { id: true, type: true, subType: true, difficulty: true, targetDomains: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    // 3. Get already-used worksheet IDs
    const usedWorksheetIds = new Set(recentCompletions.map((c) => c.worksheetId));

    // 4. Build child context for scoring
    const childAge = Math.round(
      (Date.now() - child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );
    const conditions = child.conditions.map((c) => c.conditionType);
    const latestAssessment = child.assessments[0];
    const flaggedDomains = latestAssessment?.flaggedDomains ?? [];

    // Collect IEP goal domains needing work
    const goalDomains: string[] = [];
    const goals: Array<{ domain: string; goalText: string; progress: number }> = [];
    for (const c of child.cases) {
      const iep = c.ieps[0];
      if (!iep) continue;
      for (const g of iep.goals) {
        goalDomains.push(g.domain);
        goals.push({ domain: g.domain, goalText: g.goalText, progress: g.currentProgress });
      }
    }

    // 5. Find candidate community worksheets
    const candidates = await this.prisma.worksheet.findMany({
      where: {
        isPublic: true,
        status: WorksheetStatus.PUBLISHED,
        id: { notIn: [...usedWorksheetIds] },
        ...(conditions.length > 0 ? { conditionTags: { hasSome: conditions } } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        subType: true,
        difficulty: true,
        targetDomains: true,
        conditionTags: true,
        ageRangeMin: true,
        ageRangeMax: true,
        averageRating: true,
        reviewCount: true,
        cloneCount: true,
        createdBy: { select: { isVerifiedContributor: true } },
      },
      orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
      take: 50,
    });

    // 6. Score candidates using heuristics
    const scored = candidates.map((w) => {
      let score = 0;

      // Domain match: +30 for each matching flagged domain
      const domainOverlap = w.targetDomains.filter(
        (d) => flaggedDomains.includes(d) || goalDomains.includes(d),
      ).length;
      score += domainOverlap * 30;

      // Age fit: +20 if within range
      if (w.ageRangeMin != null && w.ageRangeMax != null) {
        if (childAge >= w.ageRangeMin && childAge <= w.ageRangeMax) {
          score += 20;
        }
      } else {
        score += 10; // neutral if no range set
      }

      // Condition match: +15 per matching condition
      const conditionMatch = w.conditionTags.filter((t) => conditions.includes(t)).length;
      score += conditionMatch * 15;

      // Rating bonus: up to +15
      if (w.averageRating) score += Math.min(w.averageRating * 3, 15);

      // Popularity bonus: up to +10
      score += Math.min(w.reviewCount, 10);

      // Verified creator bonus: +5
      if (w.createdBy?.isVerifiedContributor) score += 5;

      return { worksheet: w, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const topCandidates = scored.slice(0, limit);

    // 7. Use Claude to generate personalized reasoning
    const recommendations = await this.generateReasonings(
      topCandidates,
      childAge,
      conditions,
      goals,
      flaggedDomains,
    );

    // 8. Progressive difficulty recommendation
    const difficultyRecommendation = this.computeDifficultyRecommendation(recentCompletions);

    return {
      child: { id: child.id, firstName: child.firstName },
      recommendations,
      difficultyRecommendation,
    };
  }

  /**
   * Suggest difficulty level for next worksheet based on completion patterns.
   */
  async suggestDifficulty(childId: string, domain?: string): Promise<DifficultyRecommendation> {
    const where: Prisma.WorksheetCompletionWhereInput = {
      childId,
      completedAt: { not: null },
    };

    if (domain) {
      where.worksheet = { targetDomains: { has: domain } };
    }

    const completions = await this.prisma.worksheetCompletion.findMany({
      where,
      include: {
        worksheet: { select: { difficulty: true, targetDomains: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return this.computeDifficultyRecommendation(completions);
  }

  private computeDifficultyRecommendation(
    completions: Array<{
      difficultyRating: number | null;
      engagementRating: number | null;
      completionQuality: string | null;
      worksheet: { difficulty: string };
    }>,
  ): DifficultyRecommendation {
    if (completions.length === 0) {
      return {
        suggested: WorksheetDifficulty.DEVELOPING,
        reasoning: 'No completion history available. Starting at DEVELOPING level.',
        recentPerformance: {
          avgDifficultyRating: null,
          avgEngagement: null,
          dominantQuality: null,
          completionCount: 0,
        },
      };
    }

    const withDifficulty = completions.filter((c) => c.difficultyRating != null);
    const withEngagement = completions.filter((c) => c.engagementRating != null);
    const withQuality = completions.filter((c) => c.completionQuality != null);

    const avgDifficulty = withDifficulty.length > 0
      ? withDifficulty.reduce((s, c) => s + (c.difficultyRating ?? 0), 0) / withDifficulty.length
      : null;

    const avgEngagement = withEngagement.length > 0
      ? withEngagement.reduce((s, c) => s + (c.engagementRating ?? 0), 0) / withEngagement.length
      : null;

    // Find dominant quality feedback
    const qualityCounts: Record<string, number> = {};
    withQuality.forEach((c) => {
      qualityCounts[c.completionQuality!] = (qualityCounts[c.completionQuality!] ?? 0) + 1;
    });
    const dominantQuality = Object.entries(qualityCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // Determine current difficulty level distribution
    const currentDifficulties = completions.map((c) => c.worksheet.difficulty);
    const latestDifficulty = currentDifficulties[0] ?? WorksheetDifficulty.DEVELOPING;

    let suggested: string;
    let reasoning: string;

    if (dominantQuality === 'TOO_EASY' || (avgDifficulty != null && avgDifficulty < 2)) {
      // Move up
      suggested = this.nextDifficulty(latestDifficulty, 'up');
      reasoning = `Child is finding worksheets too easy (avg difficulty rating: ${avgDifficulty?.toFixed(1) ?? 'N/A'}). Recommending moving up to ${suggested}.`;
    } else if (dominantQuality === 'TOO_HARD' || (avgDifficulty != null && avgDifficulty > 4)) {
      // Move down
      suggested = this.nextDifficulty(latestDifficulty, 'down');
      reasoning = `Child is finding worksheets too difficult (avg difficulty rating: ${avgDifficulty?.toFixed(1) ?? 'N/A'}). Recommending stepping back to ${suggested}.`;
    } else if (dominantQuality === 'JUST_RIGHT' || (avgDifficulty != null && avgDifficulty >= 2.5 && avgDifficulty <= 3.5)) {
      suggested = latestDifficulty;
      reasoning = `Current difficulty level is well-matched. Engagement is ${avgEngagement?.toFixed(1) ?? 'good'}. Keep at ${suggested}.`;
    } else {
      // Default: slightly challenge
      suggested = dominantQuality === 'CHALLENGING'
        ? latestDifficulty
        : this.nextDifficulty(latestDifficulty, 'up');
      reasoning = `Based on ${completions.length} recent completions, recommending ${suggested}.`;
    }

    return {
      suggested,
      reasoning,
      recentPerformance: {
        avgDifficultyRating: avgDifficulty ? Math.round(avgDifficulty * 10) / 10 : null,
        avgEngagement: avgEngagement ? Math.round(avgEngagement * 10) / 10 : null,
        dominantQuality,
        completionCount: completions.length,
      },
    };
  }

  private nextDifficulty(current: string, direction: 'up' | 'down'): string {
    const levels = [
      WorksheetDifficulty.FOUNDATIONAL,
      WorksheetDifficulty.DEVELOPING,
      WorksheetDifficulty.STRENGTHENING,
    ];
    const idx = levels.indexOf(current as WorksheetDifficulty);
    if (idx === -1) return WorksheetDifficulty.DEVELOPING;
    const next = direction === 'up' ? idx + 1 : idx - 1;
    return levels[Math.max(0, Math.min(levels.length - 1, next))];
  }

  private async generateReasonings(
    candidates: Array<{ worksheet: any; score: number }>,
    childAge: number,
    conditions: string[],
    goals: Array<{ domain: string; goalText: string; progress: number }>,
    flaggedDomains: string[],
  ): Promise<RecommendedWorksheet[]> {
    if (candidates.length === 0) return [];

    const childContext = `Child: ${Math.floor(childAge / 12)} years old. Conditions: ${conditions.join(', ') || 'None'}. Flagged domains: ${flaggedDomains.join(', ') || 'None'}. Active IEP goals: ${goals.map((g) => `[${g.domain}] ${g.goalText} (${g.progress}%)`).join('; ') || 'None'}.`;

    const worksheetList = candidates
      .map(
        (c, i) =>
          `${i + 1}. "${c.worksheet.title}" (${c.worksheet.type}/${c.worksheet.subType}, ${c.worksheet.difficulty}, domains: ${c.worksheet.targetDomains.join(',')}${c.worksheet.averageRating ? `, ${c.worksheet.averageRating}★` : ''})`,
      )
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system:
          'You are a pediatric therapy recommendation engine. For each worksheet, provide a brief (1-2 sentence) personalized explanation of why it would benefit this specific child. Respond ONLY with a JSON array of strings, one reasoning per worksheet in the same order.',
        messages: [
          {
            role: 'user',
            content: `${childContext}\n\nWorksheets to evaluate:\n${worksheetList}\n\nProvide a JSON array of ${candidates.length} reasoning strings, one per worksheet.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No response');
      }

      let reasonings: string[];
      try {
        let cleaned = textBlock.text.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        reasonings = JSON.parse(cleaned.trim());
      } catch {
        reasonings = candidates.map(
          (c) => `Targets ${c.worksheet.targetDomains.join(', ')} domains relevant to this child's needs.`,
        );
      }

      return candidates.map((c, i) => ({
        worksheetId: c.worksheet.id,
        title: c.worksheet.title,
        type: c.worksheet.type,
        subType: c.worksheet.subType,
        difficulty: c.worksheet.difficulty,
        targetDomains: c.worksheet.targetDomains,
        averageRating: c.worksheet.averageRating,
        reviewCount: c.worksheet.reviewCount,
        relevanceScore: c.score,
        reasoning: reasonings[i] ?? 'Recommended based on child profile match.',
      }));
    } catch (error) {
      this.logger.warn(`AI reasoning generation failed: ${error.message}`);
      return candidates.map((c) => ({
        worksheetId: c.worksheet.id,
        title: c.worksheet.title,
        type: c.worksheet.type,
        subType: c.worksheet.subType,
        difficulty: c.worksheet.difficulty,
        targetDomains: c.worksheet.targetDomains,
        averageRating: c.worksheet.averageRating,
        reviewCount: c.worksheet.reviewCount,
        relevanceScore: c.score,
        reasoning: `Targets ${c.worksheet.targetDomains.join(', ')} domains — relevant to child's developmental needs.`,
      }));
    }
  }
}
