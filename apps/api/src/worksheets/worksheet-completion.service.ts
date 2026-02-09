import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RecordCompletionDto, UpdateCompletionDto } from './dto/record-completion.dto';

@Injectable()
export class WorksheetCompletionService {
  private readonly logger = new Logger(WorksheetCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async recordCompletion(worksheetId: string, dto: RecordCompletionDto, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    // Verify child exists
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
    });
    if (!child) throw new NotFoundException('Child not found');

    // If assignmentId provided, verify it exists and belongs to this worksheet
    if (dto.assignmentId) {
      const assignment = await this.prisma.worksheetAssignment.findUnique({
        where: { id: dto.assignmentId },
      });
      if (!assignment || assignment.worksheetId !== worksheetId) {
        throw new BadRequestException('Invalid assignment for this worksheet');
      }
    }

    const completion = await this.prisma.worksheetCompletion.create({
      data: {
        worksheetId,
        childId: dto.childId,
        assignmentId: dto.assignmentId ?? null,
        completedAt: new Date(),
        timeSpentMinutes: dto.timeSpentMinutes ?? null,
        difficultyRating: dto.difficultyRating ?? null,
        engagementRating: dto.engagementRating ?? null,
        helpLevel: dto.helpLevel ?? null,
        completionQuality: dto.completionQuality ?? null,
        parentNotes: dto.parentNotes ?? null,
      },
      include: {
        worksheet: { select: { id: true, title: true, type: true, difficulty: true } },
        child: { select: { id: true, firstName: true } },
      },
    });

    // Emit event for analytics pipeline
    this.eventEmitter.emit('worksheet.completion.recorded', {
      completionId: completion.id,
      worksheetId,
      childId: dto.childId,
      assignmentId: dto.assignmentId,
    });

    this.logger.log(
      `Completion recorded: worksheet=${worksheetId}, child=${dto.childId}`,
    );

    return completion;
  }

  async updateCompletion(completionId: string, dto: UpdateCompletionDto, userId: string) {
    const completion = await this.prisma.worksheetCompletion.findUnique({
      where: { id: completionId },
    });
    if (!completion) throw new NotFoundException('Completion not found');

    return this.prisma.worksheetCompletion.update({
      where: { id: completionId },
      data: {
        timeSpentMinutes: dto.timeSpentMinutes ?? completion.timeSpentMinutes,
        difficultyRating: dto.difficultyRating ?? completion.difficultyRating,
        engagementRating: dto.engagementRating ?? completion.engagementRating,
        helpLevel: dto.helpLevel ?? completion.helpLevel,
        completionQuality: dto.completionQuality ?? completion.completionQuality,
        parentNotes: dto.parentNotes ?? completion.parentNotes,
      },
      include: {
        worksheet: { select: { id: true, title: true, type: true } },
        child: { select: { id: true, firstName: true } },
      },
    });
  }

  async getWorksheetCompletions(worksheetId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    const completions = await this.prisma.worksheetCompletion.findMany({
      where: { worksheetId },
      include: {
        child: { select: { id: true, firstName: true, nickname: true } },
        assignment: { select: { id: true, assignedById: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    return { worksheetId, completions };
  }

  async getChildCompletionHistory(childId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [completions, total] = await Promise.all([
      this.prisma.worksheetCompletion.findMany({
        where: { childId },
        include: {
          worksheet: {
            select: {
              id: true,
              title: true,
              type: true,
              subType: true,
              difficulty: true,
              targetDomains: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worksheetCompletion.count({ where: { childId } }),
    ]);

    return {
      data: completions,
      total,
      page,
      limit,
      hasMore: skip + completions.length < total,
    };
  }

  async getCompletionStats(childId: string) {
    const completions = await this.prisma.worksheetCompletion.findMany({
      where: { childId, completedAt: { not: null } },
      include: {
        worksheet: {
          select: { type: true, targetDomains: true, difficulty: true },
        },
      },
    });

    const totalCompleted = completions.length;
    const avgTimeSpent =
      completions.filter((c) => c.timeSpentMinutes != null).length > 0
        ? completions
            .filter((c) => c.timeSpentMinutes != null)
            .reduce((sum, c) => sum + (c.timeSpentMinutes ?? 0), 0) /
          completions.filter((c) => c.timeSpentMinutes != null).length
        : null;

    const avgDifficulty =
      completions.filter((c) => c.difficultyRating != null).length > 0
        ? completions
            .filter((c) => c.difficultyRating != null)
            .reduce((sum, c) => sum + (c.difficultyRating ?? 0), 0) /
          completions.filter((c) => c.difficultyRating != null).length
        : null;

    const avgEngagement =
      completions.filter((c) => c.engagementRating != null).length > 0
        ? completions
            .filter((c) => c.engagementRating != null)
            .reduce((sum, c) => sum + (c.engagementRating ?? 0), 0) /
          completions.filter((c) => c.engagementRating != null).length
        : null;

    // Distribution by quality
    const qualityDistribution: Record<string, number> = {};
    completions
      .filter((c) => c.completionQuality)
      .forEach((c) => {
        qualityDistribution[c.completionQuality!] =
          (qualityDistribution[c.completionQuality!] ?? 0) + 1;
      });

    // Count by domain
    const domainCounts: Record<string, number> = {};
    completions.forEach((c) => {
      c.worksheet.targetDomains.forEach((d) => {
        domainCounts[d] = (domainCounts[d] ?? 0) + 1;
      });
    });

    return {
      childId,
      totalCompleted,
      avgTimeSpentMinutes: avgTimeSpent ? Math.round(avgTimeSpent) : null,
      avgDifficultyRating: avgDifficulty ? Math.round(avgDifficulty * 10) / 10 : null,
      avgEngagementRating: avgEngagement ? Math.round(avgEngagement * 10) / 10 : null,
      qualityDistribution,
      domainCounts,
    };
  }
}
