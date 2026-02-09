import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorksheetStatus, Prisma } from '@prisma/client';

@Injectable()
export class WorksheetVersionService {
  private readonly logger = new Logger(WorksheetVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new version of an existing worksheet.
   * Copies content, increments version number, links via parentVersionId.
   */
  async createNewVersion(worksheetId: string, userId: string) {
    const original = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
      include: { images: true },
    });

    if (!original) throw new NotFoundException('Worksheet not found');
    if (original.createdById !== userId) {
      throw new BadRequestException('Only the worksheet creator can create new versions');
    }

    // Find the highest version in this chain
    const rootId = await this.findRootVersionId(worksheetId);
    const maxVersion = await this.prisma.worksheet.aggregate({
      where: {
        OR: [
          { id: rootId },
          { parentVersionId: rootId },
        ],
      },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? original.version) + 1;

    const newWorksheet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.worksheet.create({
        data: {
          title: `${original.title} (v${nextVersion})`,
          type: original.type,
          subType: original.subType,
          content: original.content as Prisma.JsonObject,
          metadata: original.metadata as Prisma.JsonObject,
          status: WorksheetStatus.DRAFT,
          colorMode: original.colorMode,
          difficulty: original.difficulty,
          targetDomains: original.targetDomains,
          ageRangeMin: original.ageRangeMin,
          ageRangeMax: original.ageRangeMax,
          conditionTags: original.conditionTags,
          dataSource: original.dataSource,
          screeningId: original.screeningId,
          caseId: original.caseId,
          iepGoalIds: original.iepGoalIds,
          sessionNoteIds: original.sessionNoteIds,
          version: nextVersion,
          parentVersionId: original.id,
          createdById: userId,
          childId: original.childId,
        },
      });

      // Copy images
      if (original.images.length > 0) {
        await tx.worksheetImage.createMany({
          data: original.images.map((img) => ({
            worksheetId: created.id,
            imageUrl: img.imageUrl,
            prompt: img.prompt,
            altText: img.altText,
            position: img.position,
            status: img.status,
          })),
        });
      }

      return created;
    });

    this.logger.log(
      `Version ${nextVersion} created for worksheet ${worksheetId}`,
    );

    return this.prisma.worksheet.findUnique({
      where: { id: newWorksheet.id },
      include: {
        images: { orderBy: { position: 'asc' } },
        child: { select: { id: true, firstName: true, nickname: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  /**
   * Get the version history chain for a worksheet.
   */
  async getVersionHistory(worksheetId: string) {
    const rootId = await this.findRootVersionId(worksheetId);

    // Get all versions in the chain
    const versions = await this.prisma.worksheet.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentVersionId: rootId },
        ],
      },
      select: {
        id: true,
        title: true,
        version: true,
        difficulty: true,
        status: true,
        parentVersionId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { version: 'asc' },
    });

    return {
      rootId,
      currentId: worksheetId,
      versions,
      totalVersions: versions.length,
    };
  }

  /**
   * Get a child's worksheet journey — their progression through worksheets over time.
   * Shows version chains and difficulty progression.
   */
  async getChildJourney(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, firstName: true },
    });
    if (!child) throw new NotFoundException('Child not found');

    // Get all worksheets for this child, including completions
    const worksheets = await this.prisma.worksheet.findMany({
      where: {
        childId,
        status: { not: WorksheetStatus.ARCHIVED },
      },
      select: {
        id: true,
        title: true,
        type: true,
        subType: true,
        difficulty: true,
        targetDomains: true,
        version: true,
        parentVersionId: true,
        createdAt: true,
        completions: {
          select: {
            id: true,
            completedAt: true,
            difficultyRating: true,
            engagementRating: true,
            completionQuality: true,
            timeSpentMinutes: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by domain
    const byDomain: Record<string, Array<{
      worksheetId: string;
      title: string;
      type: string;
      difficulty: string;
      version: number;
      createdAt: string;
      completed: boolean;
      completionQuality: string | null;
      engagementRating: number | null;
    }>> = {};

    for (const w of worksheets) {
      const completion = w.completions[0];
      for (const domain of w.targetDomains) {
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push({
          worksheetId: w.id,
          title: w.title,
          type: w.type,
          difficulty: w.difficulty,
          version: w.version,
          createdAt: w.createdAt.toISOString(),
          completed: !!completion?.completedAt,
          completionQuality: completion?.completionQuality ?? null,
          engagementRating: completion?.engagementRating ?? null,
        });
      }
    }

    // Identify version chains
    const versionChains: Array<{
      rootTitle: string;
      versions: Array<{ id: string; version: number; difficulty: string }>;
    }> = [];
    const roots = worksheets.filter((w) => !w.parentVersionId);
    for (const root of roots) {
      const chain = worksheets
        .filter((w) => w.id === root.id || w.parentVersionId === root.id)
        .sort((a, b) => a.version - b.version);
      if (chain.length > 1) {
        versionChains.push({
          rootTitle: root.title,
          versions: chain.map((v) => ({
            id: v.id,
            version: v.version,
            difficulty: v.difficulty,
          })),
        });
      }
    }

    return {
      child,
      totalWorksheets: worksheets.length,
      completedCount: worksheets.filter((w) => w.completions[0]?.completedAt).length,
      domainProgression: byDomain,
      versionChains,
    };
  }

  private async findRootVersionId(worksheetId: string): Promise<string> {
    let currentId = worksheetId;
    let depth = 0;
    const maxDepth = 50;

    while (depth < maxDepth) {
      const worksheet = await this.prisma.worksheet.findUnique({
        where: { id: currentId },
        select: { parentVersionId: true },
      });

      if (!worksheet || !worksheet.parentVersionId) return currentId;
      currentId = worksheet.parentVersionId;
      depth++;
    }

    return currentId;
  }
}
