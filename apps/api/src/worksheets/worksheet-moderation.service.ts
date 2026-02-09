import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlagWorksheetDto } from './dto/flag-worksheet.dto';
import { ResolveFlagDto } from './dto/resolve-flag.dto';
import { ListFlagsDto } from './dto/list-flags.dto';
import {
  WorksheetStatus,
  WorksheetFlagStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class WorksheetModerationService {
  private readonly logger = new Logger(WorksheetModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async flagWorksheet(worksheetId: string, dto: FlagWorksheetDto, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');
    if (!worksheet.isPublic) {
      throw new BadRequestException('Can only flag public worksheets');
    }
    if (worksheet.createdById === userId) {
      throw new BadRequestException('Cannot flag your own worksheet');
    }

    // Check if user already flagged this worksheet
    const existing = await this.prisma.worksheetFlag.findFirst({
      where: {
        worksheetId,
        flaggedById: userId,
        status: WorksheetFlagStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException('You have already flagged this worksheet');
    }

    const flag = await this.prisma.worksheetFlag.create({
      data: {
        worksheetId,
        flaggedById: userId,
        reason: dto.reason,
        details: dto.details ?? null,
      },
      include: {
        worksheet: { select: { id: true, title: true } },
        flaggedBy: { select: { id: true, name: true } },
      },
    });

    // Auto-flag worksheet if it hits 3+ pending flags
    const pendingCount = await this.prisma.worksheetFlag.count({
      where: { worksheetId, status: WorksheetFlagStatus.PENDING },
    });
    if (pendingCount >= 3 && worksheet.status !== WorksheetStatus.FLAGGED) {
      await this.prisma.worksheet.update({
        where: { id: worksheetId },
        data: { status: WorksheetStatus.FLAGGED },
      });
      this.logger.warn(
        `Worksheet ${worksheetId} auto-flagged after ${pendingCount} flags`,
      );
    }

    return flag;
  }

  async getModerationQueue(dto: ListFlagsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorksheetFlagWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.reason) where.reason = dto.reason;

    const [flags, total] = await Promise.all([
      this.prisma.worksheetFlag.findMany({
        where,
        include: {
          worksheet: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              isPublic: true,
              createdBy: { select: { id: true, name: true } },
            },
          },
          flaggedBy: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worksheetFlag.count({ where }),
    ]);

    return {
      data: flags,
      total,
      page,
      limit,
      hasMore: skip + flags.length < total,
    };
  }

  async resolveFlag(flagId: string, dto: ResolveFlagDto, moderatorId: string) {
    const flag = await this.prisma.worksheetFlag.findUnique({
      where: { id: flagId },
    });
    if (!flag) throw new NotFoundException('Flag not found');
    if (flag.status !== WorksheetFlagStatus.PENDING) {
      throw new BadRequestException('Flag has already been resolved');
    }

    const resolved = await this.prisma.worksheetFlag.update({
      where: { id: flagId },
      data: {
        status: dto.status,
        resolution: dto.resolution ?? null,
        resolvedById: moderatorId,
        resolvedAt: new Date(),
      },
      include: {
        worksheet: { select: { id: true, title: true, status: true } },
        flaggedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    // If actioned, archive the worksheet and make it private
    if (dto.status === WorksheetFlagStatus.ACTIONED) {
      await this.prisma.worksheet.update({
        where: { id: flag.worksheetId },
        data: {
          status: WorksheetStatus.ARCHIVED,
          isPublic: false,
        },
      });

      // Resolve all other pending flags for this worksheet
      await this.prisma.worksheetFlag.updateMany({
        where: {
          worksheetId: flag.worksheetId,
          status: WorksheetFlagStatus.PENDING,
          id: { not: flagId },
        },
        data: {
          status: WorksheetFlagStatus.ACTIONED,
          resolvedById: moderatorId,
          resolvedAt: new Date(),
          resolution: 'Bulk resolved — worksheet removed',
        },
      });

      this.logger.log(
        `Worksheet ${flag.worksheetId} archived by moderator ${moderatorId}`,
      );
    }

    // If dismissed, check if all flags for this worksheet are now resolved
    if (dto.status === WorksheetFlagStatus.DISMISSED) {
      const remainingPending = await this.prisma.worksheetFlag.count({
        where: {
          worksheetId: flag.worksheetId,
          status: WorksheetFlagStatus.PENDING,
        },
      });

      // If no more pending flags, restore worksheet to PUBLISHED if it was FLAGGED
      if (remainingPending === 0) {
        const worksheet = await this.prisma.worksheet.findUnique({
          where: { id: flag.worksheetId },
        });
        if (worksheet?.status === WorksheetStatus.FLAGGED) {
          await this.prisma.worksheet.update({
            where: { id: flag.worksheetId },
            data: { status: WorksheetStatus.PUBLISHED },
          });
        }
      }
    }

    return resolved;
  }

  async getStats() {
    const [pending, reviewed, dismissed, actioned, flaggedWorksheets] =
      await Promise.all([
        this.prisma.worksheetFlag.count({
          where: { status: WorksheetFlagStatus.PENDING },
        }),
        this.prisma.worksheetFlag.count({
          where: { status: WorksheetFlagStatus.REVIEWED },
        }),
        this.prisma.worksheetFlag.count({
          where: { status: WorksheetFlagStatus.DISMISSED },
        }),
        this.prisma.worksheetFlag.count({
          where: { status: WorksheetFlagStatus.ACTIONED },
        }),
        this.prisma.worksheet.count({
          where: { status: WorksheetStatus.FLAGGED },
        }),
      ]);

    return {
      pending,
      reviewed,
      dismissed,
      actioned,
      total: pending + reviewed + dismissed + actioned,
      flaggedWorksheets,
    };
  }
}
