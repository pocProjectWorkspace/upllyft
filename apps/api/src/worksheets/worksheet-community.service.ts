import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublishWorksheetDto } from './dto/publish-worksheet.dto';
import { BrowseCommunityDto } from './dto/browse-community.dto';
import { WorksheetStatus, Prisma } from '@prisma/client';

@Injectable()
export class WorksheetCommunityService {
  private readonly logger = new Logger(WorksheetCommunityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(worksheetId: string, dto: PublishWorksheetDto, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');
    if (worksheet.createdById !== userId) {
      throw new ForbiddenException('Only the creator can publish a worksheet');
    }
    if (worksheet.status !== WorksheetStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only fully generated worksheets can be published to the community',
      );
    }
    if (worksheet.isPublic) {
      throw new BadRequestException('Worksheet is already public');
    }

    return this.prisma.worksheet.update({
      where: { id: worksheetId },
      data: {
        isPublic: true,
        publishedAt: new Date(),
        contributorNotes: dto.contributorNotes ?? null,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        child: { select: { id: true, firstName: true, nickname: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async unpublish(worksheetId: string, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');
    if (worksheet.createdById !== userId) {
      throw new ForbiddenException('Only the creator can unpublish a worksheet');
    }
    if (!worksheet.isPublic) {
      throw new BadRequestException('Worksheet is not public');
    }

    return this.prisma.worksheet.update({
      where: { id: worksheetId },
      data: {
        isPublic: false,
        publishedAt: null,
        contributorNotes: null,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        child: { select: { id: true, firstName: true, nickname: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async browse(dto: BrowseCommunityDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.WorksheetWhereInput = {
      isPublic: true,
      status: WorksheetStatus.PUBLISHED,
    };

    if (dto.type) where.type = dto.type;
    if (dto.difficulty) where.difficulty = dto.difficulty;
    if (dto.subType) where.subType = dto.subType;
    if (dto.domain) where.targetDomains = { has: dto.domain };
    if (dto.condition) where.conditionTags = { has: dto.condition };
    if (dto.search) {
      where.title = { contains: dto.search, mode: 'insensitive' };
    }
    if (dto.ageMin != null || dto.ageMax != null) {
      where.AND = [
        ...(dto.ageMin != null ? [{ ageRangeMax: { gte: dto.ageMin } }] : []),
        ...(dto.ageMax != null ? [{ ageRangeMin: { lte: dto.ageMax } }] : []),
      ];
    }

    let orderBy: Prisma.WorksheetOrderByWithRelationInput;
    switch (dto.sortBy) {
      case 'highest_rated':
        orderBy = { averageRating: { sort: 'desc', nulls: 'last' } };
        break;
      case 'most_cloned':
        orderBy = { cloneCount: 'desc' };
        break;
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { publishedAt: 'desc' };
        break;
    }

    const [worksheets, total] = await Promise.all([
      this.prisma.worksheet.findMany({
        where,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          createdBy: { select: { id: true, name: true, role: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.worksheet.count({ where }),
    ]);

    return {
      data: worksheets,
      total,
      page,
      limit,
      hasMore: skip + worksheets.length < total,
    };
  }

  async clone(worksheetId: string, userId: string) {
    const original = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    if (!original) throw new NotFoundException('Worksheet not found');
    if (!original.isPublic) {
      throw new ForbiddenException('Can only clone public worksheets');
    }

    // Create clone in a transaction
    const cloned = await this.prisma.$transaction(async (tx) => {
      // Increment clone count on original
      await tx.worksheet.update({
        where: { id: worksheetId },
        data: { cloneCount: { increment: 1 } },
      });

      // Create the cloned worksheet
      const newWorksheet = await tx.worksheet.create({
        data: {
          title: original.title,
          type: original.type,
          subType: original.subType,
          content: original.content as Prisma.JsonObject,
          metadata: original.metadata as Prisma.JsonObject,
          pdfUrl: original.pdfUrl,
          previewUrl: original.previewUrl,
          status: WorksheetStatus.PUBLISHED,
          colorMode: original.colorMode,
          difficulty: original.difficulty,
          targetDomains: original.targetDomains,
          ageRangeMin: original.ageRangeMin,
          ageRangeMax: original.ageRangeMax,
          conditionTags: original.conditionTags,
          dataSource: original.dataSource,
          clonedFromId: worksheetId,
          createdById: userId,
        },
        include: { images: true },
      });

      // Clone images
      if (original.images.length > 0) {
        await tx.worksheetImage.createMany({
          data: original.images.map((img) => ({
            worksheetId: newWorksheet.id,
            imageUrl: img.imageUrl,
            prompt: img.prompt,
            altText: img.altText,
            position: img.position,
            status: img.status,
          })),
        });
      }

      return tx.worksheet.findUnique({
        where: { id: newWorksheet.id },
        include: {
          images: { orderBy: { position: 'asc' } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    this.logger.log(
      `Worksheet ${worksheetId} cloned to ${cloned?.id} by user ${userId}`,
    );

    return cloned;
  }
}
