import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewStatus, ReviewTriggerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCaseReviewDto,
  CompleteCaseReviewDto,
  ActivateTreatmentPlanDto,
  FlagSessionDto,
  AddSessionAddendumDto,
} from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): care-plan activation, review engine, clinical flags, and
 * signed-note addenda. Activating a treatment plan and flagging a session both
 * feed the review queue (also populated by the ReviewSchedulerTask cron).
 */
@Injectable()
export class CareReviewService {
  constructor(private prisma: PrismaService) {}

  // ── Reviews ──
  listReviews(caseId: string) {
    return this.prisma.caseReview.findMany({
      where: { caseId },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });
  }

  createReview(dto: CreateCaseReviewDto) {
    return this.prisma.caseReview.create({
      data: {
        caseId: dto.caseId,
        treatmentPlanId: dto.treatmentPlanId,
        triggerType: dto.triggerType,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async completeReview(reviewId: string, completedById: string, dto: CompleteCaseReviewDto) {
    const review = await this.prisma.caseReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Case review not found');
    return this.prisma.caseReview.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.COMPLETED, completedById, outcome: dto.outcome },
    });
  }

  // ── Treatment-plan activation (wires the previously inert TreatmentPlan) ──
  async activatePlan(planId: string, dto: ActivateTreatmentPlanDto) {
    const plan = await this.prisma.treatmentPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Treatment plan not found');

    const updated = await this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        frequency: dto.frequency ?? plan.frequency,
        sessionsPlanned: dto.sessionsPlanned ?? plan.sessionsPlanned,
        reviewIntervalDays: dto.reviewIntervalDays ?? plan.reviewIntervalDays,
      },
    });

    // Schedule the first review milestone if a cadence is set.
    if (updated.reviewIntervalDays) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + updated.reviewIntervalDays);
      await this.prisma.caseReview.create({
        data: {
          caseId: updated.caseId,
          treatmentPlanId: updated.id,
          triggerType: ReviewTriggerType.PLAN_DATE,
          dueAt,
        },
      });
    }
    return updated;
  }

  // ── Clinical flag on a session → triggers a review ──
  async flagSession(sessionId: string, dto: FlagSessionDto) {
    const session = await this.prisma.caseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    const updated = await this.prisma.caseSession.update({
      where: { id: sessionId },
      data: { clinicalFlag: true, flagType: dto.flagType, flagReason: dto.reason },
    });
    await this.prisma.caseReview.create({
      data: {
        caseId: session.caseId,
        triggerType: ReviewTriggerType.CLINICAL_FLAG,
        dueAt: new Date(),
      },
    });
    return updated;
  }

  // ── Addendum on a signed note (amend without mutating the signed record) ──
  async addAddendum(sessionId: string, authorId: string, dto: AddSessionAddendumDto) {
    const session = await this.prisma.caseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.sessionAddendum.create({
      data: { sessionId, authorId, content: dto.content },
    });
  }

  listAddenda(sessionId: string) {
    return this.prisma.sessionAddendum.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
