// apps/api/src/tasks/review-scheduler.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReviewStatus, ReviewTriggerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 3 (UAE): review-trigger engine. Creates DUE CaseReview rows from
 * care-plan review dates, pre-authorisation expiry, and IEP review dates —
 * de-duplicating against existing open reviews so the queue doesn't churn.
 */
@Injectable()
export class ReviewSchedulerTask {
  private readonly logger = new Logger(ReviewSchedulerTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduleReviews() {
    const now = new Date();
    let created = 0;

    // 1) Active treatment plans whose review interval has elapsed.
    const plans = await this.prisma.treatmentPlan.findMany({
      where: { status: 'ACTIVE', reviewIntervalDays: { not: null }, activatedAt: { not: null } },
      select: { id: true, caseId: true, reviewIntervalDays: true, activatedAt: true },
    });
    for (const p of plans) {
      const due = new Date(p.activatedAt!);
      due.setDate(due.getDate() + (p.reviewIntervalDays ?? 0));
      if (due > now) continue;
      created += await this.ensureReview(p.caseId, ReviewTriggerType.PLAN_DATE, p.id);
    }

    // 2) Approved pre-authorisations past validity → AUTH_EXPIRY review.
    const preAuths = await this.prisma.preAuthorization.findMany({
      where: { status: 'APPROVED', validUntil: { lt: now }, caseId: { not: null } },
      select: { caseId: true },
    });
    for (const a of preAuths) {
      if (a.caseId) created += await this.ensureReview(a.caseId, ReviewTriggerType.AUTH_EXPIRY, null);
    }

    // 3) IEP review dates that have elapsed.
    const ieps = await this.prisma.iEP.findMany({
      where: { status: 'ACTIVE', reviewDate: { lt: now } },
      select: { caseId: true },
    });
    for (const i of ieps) {
      created += await this.ensureReview(i.caseId, ReviewTriggerType.PLAN_DATE, null);
    }

    if (created > 0) this.logger.warn(`Scheduled ${created} case review(s) due for action.`);
  }

  /** Create a DUE review unless an open one of the same trigger already exists. */
  private async ensureReview(
    caseId: string,
    triggerType: ReviewTriggerType,
    treatmentPlanId: string | null,
  ): Promise<number> {
    const existing = await this.prisma.caseReview.findFirst({
      where: { caseId, triggerType, status: { in: [ReviewStatus.DUE, ReviewStatus.IN_PROGRESS] } },
    });
    if (existing) return 0;
    await this.prisma.caseReview.create({
      data: { caseId, triggerType, treatmentPlanId: treatmentPlanId ?? undefined, dueAt: new Date() },
    });
    return 1;
  }
}
