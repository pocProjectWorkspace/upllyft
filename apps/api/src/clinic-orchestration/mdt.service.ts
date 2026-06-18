import { Injectable, NotFoundException } from '@nestjs/common';
import { MdtReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMdtReviewDto, CompleteMdtReviewDto } from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): multidisciplinary team review with attendance + approval logs.
 */
@Injectable()
export class MdtService {
  constructor(private prisma: PrismaService) {}

  list(caseId: string) {
    return this.prisma.mdtReview.findMany({
      where: { caseId },
      include: { attendees: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateMdtReviewDto) {
    const c = await this.prisma.case.findUnique({ where: { id: dto.caseId } });
    if (!c) throw new NotFoundException('Case not found');
    return this.prisma.mdtReview.create({
      data: {
        caseId: dto.caseId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        attendees: dto.attendeeUserIds?.length
          ? { create: dto.attendeeUserIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: { attendees: true },
    });
  }

  async recordAttendance(mdtReviewId: string, userId: string, attended: boolean, approved: boolean) {
    const attendee = await this.prisma.mdtAttendee.findUnique({
      where: { mdtReviewId_userId: { mdtReviewId, userId } },
    });
    if (!attendee) throw new NotFoundException('Attendee not on this MDT review');
    return this.prisma.mdtAttendee.update({
      where: { id: attendee.id },
      data: { attended, approvedAt: approved ? new Date() : null },
    });
  }

  async complete(mdtReviewId: string, conductedById: string, dto: CompleteMdtReviewDto) {
    const review = await this.prisma.mdtReview.findUnique({ where: { id: mdtReviewId } });
    if (!review) throw new NotFoundException('MDT review not found');
    return this.prisma.mdtReview.update({
      where: { id: mdtReviewId },
      data: { status: MdtReviewStatus.COMPLETED, summary: dto.summary, conductedById },
    });
  }
}
