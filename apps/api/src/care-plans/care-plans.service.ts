import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CarePlanRecommendation,
  CarePlanStatus,
  JourneyStage,
  Prisma,
} from '@prisma/client';
import { CreateCarePlanDto, UpdateCarePlanDto } from './dto/care-plans.dto';

/** Recommendations that materialise a booked session series. */
const BOOKABLE: CarePlanRecommendation[] = [
  CarePlanRecommendation.THERAPY,
  CarePlanRecommendation.SINGLE_ASSESSMENT,
  CarePlanRecommendation.MDT_ASSESSMENT,
  CarePlanRecommendation.COACHING,
];

@Injectable()
export class CarePlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Session-generation algorithm (handoff Stage 3): starting from startDate,
   * step forward one day at a time, keep dates whose weekday is in the selected
   * day-set, stop once `count` dates are collected. Each date is stamped with
   * `timeOfDay` (HH:mm). Pure/deterministic — also used for the live preview.
   */
  generateSchedule(
    startDate: Date,
    daysOfWeek: number[],
    timeOfDay: string,
    count: number,
  ): Date[] {
    if (!daysOfWeek?.length || count < 1) return [];
    const [hh, mm] = (timeOfDay || '00:00').split(':').map((n) => parseInt(n, 10));
    const days = new Set(daysOfWeek);
    const dates: Date[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    let guard = 0;
    while (dates.length < count && guard < 1000) {
      if (days.has(cursor.getDay())) {
        const d = new Date(cursor);
        d.setHours(hh || 0, mm || 0, 0, 0);
        dates.push(d);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return dates;
  }

  /** Configurable defaults per recommendation type (pricing + day/count pattern). */
  async getPricingDefaults() {
    return this.prisma.carePlanPricingDefault.findMany({
      where: { active: true },
      orderBy: { unitPrice: 'desc' },
    });
  }

  private async assertCase(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    return caseRecord;
  }

  async listPlans(caseId: string) {
    await this.assertCase(caseId);
    return this.prisma.carePlan.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true } } },
    });
  }

  async getPlan(caseId: string, planId: string) {
    const plan = await this.prisma.carePlan.findFirst({
      where: { id: planId, caseId },
      include: {
        sessions: {
          orderBy: { scheduledAt: 'asc' },
          include: { therapist: { select: { id: true, name: true, image: true } } },
        },
      },
    });
    if (!plan) throw new NotFoundException('Care plan not found');
    return plan;
  }

  async createPlan(caseId: string, userId: string, dto: CreateCarePlanDto) {
    await this.assertCase(caseId);
    const unitPrice = dto.unitPrice ?? 0;
    const total = unitPrice * (dto.sessionCount ?? 0);
    return this.prisma.carePlan.create({
      data: {
        caseId,
        createdById: userId,
        consultationRecordId: dto.consultationRecordId,
        recommendation: dto.recommendation,
        disciplines: dto.disciplines ?? [],
        primaryTherapistId: dto.primaryTherapistId,
        startDate: new Date(dto.startDate),
        timeOfDay: dto.timeOfDay,
        daysOfWeek: dto.daysOfWeek ?? [],
        sessionCount: dto.sessionCount ?? 0,
        packageName: dto.packageName,
        unitPrice,
        totalAmount: total,
        paymentStatus: dto.paymentStatus ?? 'PENDING',
        reviewInWeeks: dto.reviewInWeeks,
        externalReferralTarget: dto.externalReferralTarget,
        status: 'DRAFT',
      },
    });
  }

  async updatePlan(caseId: string, planId: string, dto: UpdateCarePlanDto) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Care plan not found');
    if (plan.status !== 'DRAFT') {
      throw new BadRequestException('Only draft care plans can be edited');
    }
    const data: Prisma.CarePlanUpdateInput = {
      ...(dto.recommendation !== undefined && { recommendation: dto.recommendation }),
      ...(dto.disciplines !== undefined && { disciplines: dto.disciplines }),
      ...(dto.primaryTherapistId !== undefined && { primaryTherapistId: dto.primaryTherapistId }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.timeOfDay !== undefined && { timeOfDay: dto.timeOfDay }),
      ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
      ...(dto.sessionCount !== undefined && { sessionCount: dto.sessionCount }),
      ...(dto.packageName !== undefined && { packageName: dto.packageName }),
      ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
      ...(dto.paymentStatus !== undefined && { paymentStatus: dto.paymentStatus }),
      ...(dto.reviewInWeeks !== undefined && { reviewInWeeks: dto.reviewInWeeks }),
      ...(dto.externalReferralTarget !== undefined && {
        externalReferralTarget: dto.externalReferralTarget,
      }),
    };
    // Recompute total when price or count changes
    const unitPrice = dto.unitPrice ?? plan.unitPrice;
    const count = dto.sessionCount ?? plan.sessionCount;
    data.totalAmount = unitPrice * count;
    return this.prisma.carePlan.update({ where: { id: planId }, data });
  }

  async lockPlan(caseId: string, planId: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Care plan not found');
    return this.prisma.carePlan.update({
      where: { id: planId },
      data: { status: 'LOCKED', lockedAt: new Date() },
    });
  }

  /**
   * Confirm & book: generate every session in the recurring series in one action,
   * flip the plan ACTIVE, record parent acceptance, and advance the case journey
   * stage. For NONE (monitor) / REFERRAL there is no series — just activate.
   */
  async confirmAndBook(caseId: string, userId: string, planId: string) {
    const caseRecord = await this.assertCase(caseId);
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Care plan not found');
    if (plan.status === 'ACTIVE' || plan.status === 'COMPLETED') {
      throw new BadRequestException('Care plan has already been booked');
    }

    const therapistUserId = plan.primaryTherapistId ?? userId;
    const discipline = plan.disciplines?.[0] ?? null;
    let createdSessions = 0;

    if (BOOKABLE.includes(plan.recommendation) && plan.sessionCount > 0) {
      const dates = this.generateSchedule(
        plan.startDate,
        plan.daysOfWeek,
        plan.timeOfDay,
        plan.sessionCount,
      );
      if (dates.length) {
        await this.prisma.caseSession.createMany({
          data: dates.map((d) => ({
            caseId,
            carePlanId: plan.id,
            therapistId: therapistUserId,
            discipline: discipline ?? undefined,
            scheduledAt: d,
            sessionType: plan.packageName ?? undefined,
            noteStatus: 'DRAFT' as const,
          })),
        });
        createdSessions = dates.length;
      }
    }

    // Advance journey stage based on recommendation
    let nextStage: JourneyStage | null = null;
    if (
      plan.recommendation === CarePlanRecommendation.THERAPY ||
      plan.recommendation === CarePlanRecommendation.COACHING
    ) {
      nextStage = JourneyStage.IN_THERAPY;
    } else if (
      plan.recommendation === CarePlanRecommendation.SINGLE_ASSESSMENT ||
      plan.recommendation === CarePlanRecommendation.MDT_ASSESSMENT
    ) {
      nextStage = JourneyStage.IN_ASSESSMENT;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.carePlan.update({
        where: { id: planId },
        data: {
          status: CarePlanStatus.ACTIVE,
          parentAcceptedAt: new Date(),
          lockedAt: plan.lockedAt ?? new Date(),
        },
      }),
      ...(nextStage && caseRecord.journeyStage !== JourneyStage.DISCHARGED
        ? [
            this.prisma.case.update({
              where: { id: caseId },
              data: { journeyStage: nextStage },
            }),
          ]
        : []),
      this.prisma.caseAuditLog.create({
        data: {
          caseId,
          userId,
          action: 'CARE_PLAN_BOOKED',
          entityType: 'CarePlan',
          entityId: planId,
          changes: { sessionsCreated: createdSessions } as any,
        },
      }),
    ]);

    return { plan: updated, sessionsCreated: createdSessions };
  }
}
