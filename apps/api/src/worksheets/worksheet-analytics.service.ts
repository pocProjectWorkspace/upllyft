import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorksheetAnalyticsService {
  private readonly logger = new Logger(WorksheetAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Triggered after a worksheet completion is recorded.
   * Measures effectiveness by comparing IEP goal progress before/after worksheet usage.
   */
  @OnEvent('worksheet.completion.recorded')
  async onCompletionRecorded(payload: {
    completionId: string;
    worksheetId: string;
    childId: string;
  }) {
    try {
      await this.measureEffectiveness(payload.worksheetId, payload.childId);
    } catch (error) {
      this.logger.warn(
        `Effectiveness measurement failed: ${error.message}`,
      );
    }
  }

  async measureEffectiveness(worksheetId: string, childId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) return;

    // Find child's active cases with IEP goals in the worksheet's target domains
    const cases = await this.prisma.case.findMany({
      where: {
        childId,
        status: 'ACTIVE',
      },
      include: {
        ieps: {
          where: { status: 'ACTIVE' },
          include: {
            goals: {
              where: {
                status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
              },
            },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const worksheetDomains = worksheet.targetDomains;
    const domainMap: Record<string, string> = {
      'Motor': 'MOTOR', 'Fine Motor': 'MOTOR', 'Gross Motor': 'MOTOR',
      'Language': 'LANGUAGE', 'Speech': 'LANGUAGE', 'Communication': 'LANGUAGE',
      'Social': 'SOCIAL', 'Emotional': 'SOCIAL', 'Social-Emotional': 'SOCIAL',
      'Cognitive': 'COGNITIVE', 'Academic': 'COGNITIVE',
      'Sensory': 'SENSORY',
      'Adaptive': 'ADAPTIVE', 'Self-Care': 'ADAPTIVE', 'Daily Living': 'ADAPTIVE',
    };

    for (const caseRecord of cases) {
      const activeIep = caseRecord.ieps[0];
      if (!activeIep) continue;

      for (const goal of activeIep.goals) {
        const goalDomain = domainMap[goal.domain] ?? goal.domain.toUpperCase();
        if (!worksheetDomains.includes(goalDomain)) continue;

        // Check if we already have a recent measurement for this goal+worksheet
        const existingRecent = await this.prisma.worksheetEffectiveness.findFirst({
          where: {
            worksheetId,
            childId,
            goalId: goal.id,
            measuredAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
            },
          },
        });
        if (existingRecent) continue;

        // Find previous effectiveness measurement for this goal
        const previous = await this.prisma.worksheetEffectiveness.findFirst({
          where: { childId, goalId: goal.id },
          orderBy: { measuredAt: 'desc' },
        });

        const preScore = previous?.postScore ?? previous?.goalProgress ?? 0;

        await this.prisma.worksheetEffectiveness.create({
          data: {
            worksheetId,
            childId,
            domain: goalDomain,
            preScore,
            postScore: goal.currentProgress,
            progressDelta: goal.currentProgress - preScore,
            goalId: goal.id,
            goalProgress: goal.currentProgress,
          },
        });
      }
    }

    this.logger.log(
      `Effectiveness measured: worksheet=${worksheetId}, child=${childId}`,
    );
  }

  /**
   * Get a child's progress timeline across developmental domains.
   */
  async getChildProgressTimeline(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, firstName: true },
    });
    if (!child) throw new NotFoundException('Child not found');

    const effectiveness = await this.prisma.worksheetEffectiveness.findMany({
      where: { childId },
      include: {
        worksheet: {
          select: { id: true, title: true, type: true, difficulty: true },
        },
      },
      orderBy: { measuredAt: 'asc' },
    });

    // Group by domain
    const byDomain: Record<string, Array<{
      date: string;
      worksheetId: string;
      worksheetTitle: string;
      preScore: number | null;
      postScore: number | null;
      progressDelta: number | null;
      goalProgress: number | null;
    }>> = {};

    for (const e of effectiveness) {
      if (!byDomain[e.domain]) byDomain[e.domain] = [];
      byDomain[e.domain].push({
        date: e.measuredAt.toISOString(),
        worksheetId: e.worksheetId,
        worksheetTitle: e.worksheet.title,
        preScore: e.preScore,
        postScore: e.postScore,
        progressDelta: e.progressDelta,
        goalProgress: e.goalProgress,
      });
    }

    // Compute domain summaries
    const domainSummaries = Object.entries(byDomain).map(([domain, entries]) => {
      const totalDelta = entries.reduce((sum, e) => sum + (e.progressDelta ?? 0), 0);
      const latestProgress = entries[entries.length - 1]?.goalProgress ?? null;
      return {
        domain,
        measurementCount: entries.length,
        totalProgressDelta: Math.round(totalDelta * 10) / 10,
        latestProgress,
        trend: totalDelta > 0 ? 'improving' : totalDelta < 0 ? 'declining' : 'stable',
      };
    });

    return {
      child,
      domainSummaries,
      timeline: byDomain,
      totalMeasurements: effectiveness.length,
    };
  }

  /**
   * Get effectiveness score for a specific worksheet across all children who used it.
   */
  async getWorksheetEffectivenessScore(worksheetId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
      select: { id: true, title: true, type: true, targetDomains: true },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    const records = await this.prisma.worksheetEffectiveness.findMany({
      where: { worksheetId },
    });

    if (records.length === 0) {
      return {
        worksheet,
        effectivenessScore: null,
        sampleSize: 0,
        domainBreakdown: {},
        message: 'No effectiveness data available yet',
      };
    }

    const avgDelta =
      records.reduce((sum, r) => sum + (r.progressDelta ?? 0), 0) / records.length;

    const uniqueChildren = new Set(records.map((r) => r.childId)).size;

    // Breakdown by domain
    const domainBreakdown: Record<string, { avgDelta: number; count: number }> = {};
    for (const r of records) {
      if (!domainBreakdown[r.domain]) {
        domainBreakdown[r.domain] = { avgDelta: 0, count: 0 };
      }
      domainBreakdown[r.domain].avgDelta += r.progressDelta ?? 0;
      domainBreakdown[r.domain].count += 1;
    }
    for (const domain of Object.keys(domainBreakdown)) {
      domainBreakdown[domain].avgDelta =
        Math.round((domainBreakdown[domain].avgDelta / domainBreakdown[domain].count) * 10) / 10;
    }

    return {
      worksheet,
      effectivenessScore: Math.round(avgDelta * 10) / 10,
      sampleSize: records.length,
      uniqueChildren,
      domainBreakdown,
    };
  }

  /**
   * Find the most effective worksheets for a given domain/condition.
   */
  async getMostEffectiveWorksheets(
    domain?: string,
    condition?: string,
    limit = 10,
  ) {
    // Aggregate effectiveness by worksheet
    const groupBy = await this.prisma.worksheetEffectiveness.groupBy({
      by: ['worksheetId'],
      where: domain ? { domain } : undefined,
      _avg: { progressDelta: true },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } }, // minimum 2 data points
      orderBy: { _avg: { progressDelta: 'desc' } },
      take: limit,
    });

    if (groupBy.length === 0) {
      return { data: [], domain, condition };
    }

    const worksheetIds = groupBy.map((g) => g.worksheetId);
    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        id: { in: worksheetIds },
        ...(condition ? { conditionTags: { has: condition } } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        subType: true,
        difficulty: true,
        targetDomains: true,
        conditionTags: true,
        averageRating: true,
        reviewCount: true,
        cloneCount: true,
        isPublic: true,
        createdBy: { select: { id: true, name: true, isVerifiedContributor: true } },
      },
    });

    const worksheetMap = new Map(worksheets.map((w) => [w.id, w]));

    const data = groupBy
      .map((g) => ({
        worksheet: worksheetMap.get(g.worksheetId) ?? null,
        avgProgressDelta: Math.round((g._avg.progressDelta ?? 0) * 10) / 10,
        dataPoints: g._count.id,
      }))
      .filter((d) => d.worksheet != null);

    return { data, domain, condition };
  }
}
