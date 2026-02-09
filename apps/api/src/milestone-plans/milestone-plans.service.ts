import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateMilestonePlanDto,
  CreateMilestoneDto,
  BulkCreateMilestonesDto,
  UpdateMilestoneDto,
  UpdateMilestonePlanDto,
} from './dto/milestone-plans.dto';

@Injectable()
export class MilestonePlansService {
  constructor(private prisma: PrismaService) {}

  async createPlan(caseId: string, userId: string, dto: CreateMilestonePlanDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const latestPlan = await this.prisma.milestonePlan.findFirst({
      where: { caseId },
      orderBy: { version: 'desc' },
    });
    const version = (latestPlan?.version || 0) + 1;

    const plan = await this.prisma.milestonePlan.create({
      data: {
        caseId,
        version,
        previousVersionId: latestPlan?.id,
      },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    await this.auditLog(caseId, userId, 'MILESTONE_PLAN_CREATED', 'MilestonePlan', plan.id);
    return plan;
  }

  async listPlans(caseId: string) {
    return this.prisma.milestonePlan.findMany({
      where: { caseId },
      orderBy: { version: 'desc' },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        _count: { select: { milestones: true } },
      },
    });
  }

  async getPlan(caseId: string, planId: string) {
    const plan = await this.prisma.milestonePlan.findFirst({
      where: { id: planId, caseId },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        previousVersion: { select: { id: true, version: true } },
        nextVersion: { select: { id: true, version: true } },
      },
    });
    if (!plan) throw new NotFoundException('Milestone plan not found');
    return plan;
  }

  async updatePlan(caseId: string, planId: string, userId: string, dto: UpdateMilestonePlanDto) {
    const plan = await this.prisma.milestonePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Milestone plan not found');

    const updated = await this.prisma.milestonePlan.update({
      where: { id: planId },
      data: {
        ...(dto.sharedWithParent !== undefined && { sharedWithParent: dto.sharedWithParent }),
      },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    await this.auditLog(caseId, userId, 'MILESTONE_PLAN_UPDATED', 'MilestonePlan', planId);
    return updated;
  }

  async createNewVersion(caseId: string, planId: string, userId: string) {
    const currentPlan = await this.prisma.milestonePlan.findFirst({
      where: { id: planId, caseId },
      include: { milestones: true },
    });
    if (!currentPlan) throw new NotFoundException('Milestone plan not found');

    await this.prisma.milestonePlan.update({
      where: { id: planId },
      data: { status: 'archived' },
    });

    const newPlan = await this.prisma.milestonePlan.create({
      data: {
        caseId,
        version: currentPlan.version + 1,
        previousVersionId: currentPlan.id,
        milestones: {
          create: currentPlan.milestones.map((m) => ({
            domain: m.domain,
            description: m.description,
            expectedAge: m.expectedAge,
            targetDate: m.targetDate,
            status: m.status,
            linkedScreeningId: m.linkedScreeningId,
            achievedAt: m.achievedAt,
            order: m.order,
          })),
        },
      },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    await this.auditLog(caseId, userId, 'MILESTONE_PLAN_NEW_VERSION', 'MilestonePlan', newPlan.id);
    return newPlan;
  }

  // ─── MILESTONES ────────────────────────────────────────

  async addMilestone(caseId: string, planId: string, userId: string, dto: CreateMilestoneDto) {
    const plan = await this.prisma.milestonePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Milestone plan not found');

    let order = dto.order;
    if (order === undefined) {
      const last = await this.prisma.milestone.findFirst({
        where: { planId },
        orderBy: { order: 'desc' },
      });
      order = (last?.order || 0) + 1;
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        planId,
        domain: dto.domain,
        description: dto.description,
        expectedAge: dto.expectedAge,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        linkedScreeningId: dto.linkedScreeningId,
        order,
      },
    });

    await this.auditLog(caseId, userId, 'MILESTONE_ADDED', 'Milestone', milestone.id);
    return milestone;
  }

  async bulkAddMilestones(caseId: string, planId: string, userId: string, dto: BulkCreateMilestonesDto) {
    const plan = await this.prisma.milestonePlan.findFirst({ where: { id: planId, caseId } });
    if (!plan) throw new NotFoundException('Milestone plan not found');

    const last = await this.prisma.milestone.findFirst({
      where: { planId },
      orderBy: { order: 'desc' },
    });
    let nextOrder = (last?.order || 0) + 1;

    const milestones = await this.prisma.$transaction(
      dto.milestones.map((m) =>
        this.prisma.milestone.create({
          data: {
            planId,
            domain: m.domain,
            description: m.description,
            expectedAge: m.expectedAge,
            targetDate: m.targetDate ? new Date(m.targetDate) : undefined,
            linkedScreeningId: m.linkedScreeningId,
            order: m.order ?? nextOrder++,
          },
        }),
      ),
    );

    await this.auditLog(caseId, userId, 'MILESTONES_BULK_ADDED', 'Milestone', planId, {
      count: milestones.length,
    });
    return milestones;
  }

  async updateMilestone(
    caseId: string,
    planId: string,
    milestoneId: string,
    userId: string,
    dto: UpdateMilestoneDto,
  ) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, plan: { id: planId, caseId } },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const data: Prisma.MilestoneUpdateInput = {};
    if (dto.domain) data.domain = dto.domain;
    if (dto.description) data.description = dto.description;
    if (dto.expectedAge !== undefined) data.expectedAge = dto.expectedAge;
    if (dto.targetDate) data.targetDate = new Date(dto.targetDate);
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'ACHIEVED') data.achievedAt = new Date();
    }
    if (dto.linkedScreeningId !== undefined) data.linkedScreeningId = dto.linkedScreeningId;
    if (dto.order !== undefined) data.order = dto.order;

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data,
    });

    await this.auditLog(caseId, userId, 'MILESTONE_UPDATED', 'Milestone', milestoneId);
    return updated;
  }

  async deleteMilestone(caseId: string, planId: string, milestoneId: string, userId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, plan: { id: planId, caseId } },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    await this.prisma.milestone.delete({ where: { id: milestoneId } });
    await this.auditLog(caseId, userId, 'MILESTONE_DELETED', 'Milestone', milestoneId);
    return { success: true };
  }

  private async auditLog(
    caseId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ) {
    await this.prisma.caseAuditLog.create({
      data: { caseId, userId, action, entityType, entityId, changes },
    });
  }
}
