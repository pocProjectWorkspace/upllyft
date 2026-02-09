import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IEPStatus, Prisma } from '@prisma/client';
import {
  CreateIEPDto,
  UpdateIEPDto,
  CreateIEPGoalDto,
  UpdateIEPGoalDto,
  BulkCreateGoalsDto,
  CreateIEPTemplateDto,
  UpdateIEPTemplateDto,
  CreateGoalBankItemDto,
  SearchGoalBankDto,
  ListIEPsQueryDto,
} from './dto/ieps.dto';

@Injectable()
export class IEPsService {
  constructor(private prisma: PrismaService) {}

  // ─── IEP CRUD ──────────────────────────────────────────

  async createIEP(caseId: string, userId: string, dto: CreateIEPDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // Determine version number
    const latestIEP = await this.prisma.iEP.findFirst({
      where: { caseId },
      orderBy: { version: 'desc' },
    });
    const version = (latestIEP?.version || 0) + 1;

    // If template provided, validate it exists
    if (dto.templateId) {
      const template = await this.prisma.iEPTemplate.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new NotFoundException('Template not found');
    }

    const iep = await this.prisma.iEP.create({
      data: {
        caseId,
        version,
        createdById: userId,
        templateId: dto.templateId,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        accommodations: dto.accommodations,
        servicesTracking: dto.servicesTracking,
        previousVersionId: latestIEP?.id,
      },
      include: {
        goals: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    await this.auditLog(caseId, userId, 'IEP_CREATED', 'IEP', iep.id);
    return iep;
  }

  async listIEPs(caseId: string, query: ListIEPsQueryDto) {
    const where: Prisma.IEPWhereInput = { caseId };
    if (query.status) where.status = query.status;

    return this.prisma.iEP.findMany({
      where,
      orderBy: { version: 'desc' },
      include: {
        goals: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { goals: true } },
      },
    });
  }

  async getIEP(caseId: string, iepId: string) {
    const iep = await this.prisma.iEP.findFirst({
      where: { id: iepId, caseId },
      include: {
        goals: {
          orderBy: { order: 'asc' },
          include: {
            sessionProgress: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                session: {
                  select: { id: true, scheduledAt: true, therapist: { select: { name: true } } },
                },
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        previousVersion: { select: { id: true, version: true, status: true } },
        nextVersion: { select: { id: true, version: true, status: true } },
      },
    });

    if (!iep) throw new NotFoundException('IEP not found');
    return iep;
  }

  async updateIEP(caseId: string, iepId: string, userId: string, dto: UpdateIEPDto) {
    const iep = await this.prisma.iEP.findFirst({ where: { id: iepId, caseId } });
    if (!iep) throw new NotFoundException('IEP not found');

    const updated = await this.prisma.iEP.update({
      where: { id: iepId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.reviewDate && { reviewDate: new Date(dto.reviewDate) }),
        ...(dto.accommodations !== undefined && { accommodations: dto.accommodations }),
        ...(dto.servicesTracking !== undefined && { servicesTracking: dto.servicesTracking }),
        ...(dto.meetingNotes !== undefined && { meetingNotes: dto.meetingNotes }),
      },
      include: {
        goals: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.auditLog(caseId, userId, 'IEP_UPDATED', 'IEP', iepId, {
      fields: Object.keys(dto),
    });

    return updated;
  }

  async approveIEP(caseId: string, iepId: string, userId: string, role: 'therapist' | 'parent') {
    const iep = await this.prisma.iEP.findFirst({ where: { id: iepId, caseId } });
    if (!iep) throw new NotFoundException('IEP not found');

    const data: Prisma.IEPUpdateInput = {};
    if (role === 'therapist') {
      if (iep.approvedByTherapistAt) throw new BadRequestException('Already approved by therapist');
      data.approvedByTherapistAt = new Date();
    } else {
      if (iep.approvedByParentAt) throw new BadRequestException('Already approved by parent');
      data.approvedByParentAt = new Date();
    }

    // If both approved, set status to APPROVED
    const willBeBothApproved =
      (role === 'therapist' && iep.approvedByParentAt) ||
      (role === 'parent' && iep.approvedByTherapistAt);

    if (willBeBothApproved) {
      data.status = IEPStatus.APPROVED;
    }

    const updated = await this.prisma.iEP.update({
      where: { id: iepId },
      data,
      include: {
        goals: { orderBy: { order: 'asc' } },
      },
    });

    await this.auditLog(caseId, userId, `IEP_APPROVED_BY_${role.toUpperCase()}`, 'IEP', iepId);
    return updated;
  }

  async createNewVersion(caseId: string, iepId: string, userId: string) {
    const currentIEP = await this.prisma.iEP.findFirst({
      where: { id: iepId, caseId },
      include: { goals: true },
    });
    if (!currentIEP) throw new NotFoundException('IEP not found');

    // Archive the current version
    await this.prisma.iEP.update({
      where: { id: iepId },
      data: { status: IEPStatus.ARCHIVED },
    });

    // Create new version with copied goals
    const newIEP = await this.prisma.iEP.create({
      data: {
        caseId,
        version: currentIEP.version + 1,
        createdById: userId,
        templateId: currentIEP.templateId,
        reviewDate: currentIEP.reviewDate,
        accommodations: currentIEP.accommodations || undefined,
        servicesTracking: currentIEP.servicesTracking || undefined,
        previousVersionId: currentIEP.id,
        goals: {
          create: currentIEP.goals.map((g) => ({
            domain: g.domain,
            goalText: g.goalText,
            targetDate: g.targetDate,
            baselineScreeningId: g.baselineScreeningId,
            currentProgress: g.currentProgress,
            status: g.status,
            linkedScreeningIndicators: g.linkedScreeningIndicators || undefined,
            order: g.order,
          })),
        },
      },
      include: {
        goals: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.auditLog(caseId, userId, 'IEP_NEW_VERSION', 'IEP', newIEP.id, {
      fromVersion: currentIEP.version,
      toVersion: newIEP.version,
    });

    return newIEP;
  }

  // ─── GOALS ─────────────────────────────────────────────

  async addGoal(caseId: string, iepId: string, userId: string, dto: CreateIEPGoalDto) {
    const iep = await this.prisma.iEP.findFirst({ where: { id: iepId, caseId } });
    if (!iep) throw new NotFoundException('IEP not found');

    // Auto-set order to end
    let order = dto.order;
    if (order === undefined) {
      const lastGoal = await this.prisma.iEPGoal.findFirst({
        where: { iepId },
        orderBy: { order: 'desc' },
      });
      order = (lastGoal?.order || 0) + 1;
    }

    const goal = await this.prisma.iEPGoal.create({
      data: {
        iepId,
        domain: dto.domain,
        goalText: dto.goalText,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        baselineScreeningId: dto.baselineScreeningId,
        linkedScreeningIndicators: dto.linkedScreeningIndicators,
        order,
      },
    });

    await this.auditLog(caseId, userId, 'GOAL_ADDED', 'IEPGoal', goal.id);
    return goal;
  }

  async bulkAddGoals(caseId: string, iepId: string, userId: string, dto: BulkCreateGoalsDto) {
    const iep = await this.prisma.iEP.findFirst({ where: { id: iepId, caseId } });
    if (!iep) throw new NotFoundException('IEP not found');

    const lastGoal = await this.prisma.iEPGoal.findFirst({
      where: { iepId },
      orderBy: { order: 'desc' },
    });
    let nextOrder = (lastGoal?.order || 0) + 1;

    const goals = await this.prisma.$transaction(
      dto.goals.map((g) =>
        this.prisma.iEPGoal.create({
          data: {
            iepId,
            domain: g.domain,
            goalText: g.goalText,
            targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
            baselineScreeningId: g.baselineScreeningId,
            linkedScreeningIndicators: g.linkedScreeningIndicators,
            order: g.order ?? nextOrder++,
          },
        }),
      ),
    );

    await this.auditLog(caseId, userId, 'GOALS_BULK_ADDED', 'IEPGoal', iepId, {
      count: goals.length,
    });

    return goals;
  }

  async updateGoal(
    caseId: string,
    iepId: string,
    goalId: string,
    userId: string,
    dto: UpdateIEPGoalDto,
  ) {
    const goal = await this.prisma.iEPGoal.findFirst({
      where: { id: goalId, iep: { id: iepId, caseId } },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const updated = await this.prisma.iEPGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.domain && { domain: dto.domain }),
        ...(dto.goalText && { goalText: dto.goalText }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.currentProgress !== undefined && { currentProgress: dto.currentProgress }),
        ...(dto.status && { status: dto.status }),
        ...(dto.linkedScreeningIndicators !== undefined && {
          linkedScreeningIndicators: dto.linkedScreeningIndicators,
        }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    await this.auditLog(caseId, userId, 'GOAL_UPDATED', 'IEPGoal', goalId, {
      fields: Object.keys(dto),
    });

    return updated;
  }

  async deleteGoal(caseId: string, iepId: string, goalId: string, userId: string) {
    const goal = await this.prisma.iEPGoal.findFirst({
      where: { id: goalId, iep: { id: iepId, caseId } },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    await this.prisma.iEPGoal.delete({ where: { id: goalId } });
    await this.auditLog(caseId, userId, 'GOAL_DELETED', 'IEPGoal', goalId);
    return { success: true };
  }

  // ─── TEMPLATES ─────────────────────────────────────────

  async listTemplates(userId: string, organizationId?: string) {
    const where: Prisma.IEPTemplateWhereInput = {
      OR: [
        { isGlobal: true },
        { createdById: userId },
        ...(organizationId ? [{ organizationId }] : []),
      ],
    };

    return this.prisma.iEPTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { ieps: true } },
      },
    });
  }

  async createTemplate(userId: string, dto: CreateIEPTemplateDto) {
    return this.prisma.iEPTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        content: dto.content,
        isGlobal: dto.isGlobal || false,
        organizationId: dto.organizationId,
        createdById: userId,
      },
    });
  }

  async getTemplate(templateId: string) {
    const template = await this.prisma.iEPTemplate.findUnique({
      where: { id: templateId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(templateId: string, userId: string, dto: UpdateIEPTemplateDto) {
    const template = await this.prisma.iEPTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdById !== userId) {
      throw new BadRequestException('Can only edit your own templates');
    }

    return this.prisma.iEPTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.content && { content: dto.content }),
      },
    });
  }

  async deleteTemplate(templateId: string, userId: string) {
    const template = await this.prisma.iEPTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdById !== userId && !template.isGlobal) {
      throw new BadRequestException('Can only delete your own templates');
    }

    // Check if any IEPs use this template
    const usageCount = await this.prisma.iEP.count({ where: { templateId } });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete template: ${usageCount} IEP(s) are using it`,
      );
    }

    await this.prisma.iEPTemplate.delete({ where: { id: templateId } });
    return { success: true };
  }

  // ─── GOAL BANK ─────────────────────────────────────────

  async searchGoalBank(query: SearchGoalBankDto) {
    const limit = parseInt(query.limit || '20', 10);
    const where: Prisma.GoalBankItemWhereInput = {};

    if (query.domain) where.domain = query.domain;
    if (query.condition) where.condition = query.condition;
    if (query.search) {
      where.goalText = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.goalBankItem.findMany({
      where,
      take: limit,
      orderBy: { domain: 'asc' },
    });
  }

  async createGoalBankItem(userId: string, dto: CreateGoalBankItemDto) {
    return this.prisma.goalBankItem.create({
      data: {
        domain: dto.domain,
        condition: dto.condition,
        goalText: dto.goalText,
        isGlobal: dto.isGlobal || false,
        organizationId: dto.organizationId,
        createdById: userId,
      },
    });
  }

  // ─── HELPERS ───────────────────────────────────────────

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
