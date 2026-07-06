import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentCategory, IncidentStatus, Prisma } from '@prisma/client';
import {
  CreateEscalationDto,
  UpdateEscalationDto,
  FollowUpDto,
} from './dto/case-escalation.dto';

@Injectable()
export class CaseEscalationService {
  constructor(private prisma: PrismaService) {}

  list(caseId: string) {
    return this.prisma.caseIncident.findMany({
      where: { caseId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(caseId: string, id: string) {
    const rec = await this.prisma.caseIncident.findFirst({ where: { id, caseId } });
    if (!rec) throw new NotFoundException('Escalation not found');
    return rec;
  }

  async create(caseId: string, userId: string, dto: CreateEscalationDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    return this.prisma.caseIncident.create({
      data: {
        caseId,
        childId: caseRecord.childId,
        raisedById: userId,
        raisedFromModule: dto.source ?? 'Escalation',
        category: dto.category ?? IncidentCategory.OTHER,
        urgency: dto.urgency ?? undefined,
        riskLabel: dto.riskLabel,
        description: dto.description ?? dto.riskLabel ?? 'Escalation raised',
        status: IncidentStatus.OPEN,
      },
    });
  }

  async update(caseId: string, id: string, dto: UpdateEscalationDto) {
    await this.get(caseId, id);
    return this.prisma.caseIncident.update({
      where: { id },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.urgency !== undefined && { urgency: dto.urgency }),
        ...(dto.riskLabel !== undefined && { riskLabel: dto.riskLabel }),
        ...(dto.referralTarget !== undefined && { referralTarget: dto.referralTarget }),
        ...(dto.reviewerNote !== undefined && { reviewerNote: dto.reviewerNote }),
        ...(dto.reviewerApproved !== undefined && { reviewerApproved: dto.reviewerApproved }),
        ...(dto.consentObtained !== undefined && { consentObtained: dto.consentObtained }),
        ...(dto.shareScope !== undefined && { shareScope: dto.shareScope as Prisma.InputJsonValue }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /** Send referral — gated on reviewer approval, consent, and ≥1 shared item. */
  async send(caseId: string, userId: string, id: string) {
    const rec = await this.get(caseId, id);
    const sharedItems = Object.values((rec.shareScope as Record<string, boolean>) ?? {}).filter(
      Boolean,
    ).length;
    if (!rec.reviewerApproved) throw new BadRequestException('Clinical lead approval is required');
    if (!rec.consentObtained) throw new BadRequestException('Parent consent is required to share');
    if (sharedItems < 1) throw new BadRequestException('Select at least one item to share');
    if (!rec.referralTarget) throw new BadRequestException('A referral target is required');

    const updated = await this.prisma.caseIncident.update({
      where: { id },
      data: { status: IncidentStatus.REFERRAL_SENT, sentAt: new Date() },
    });
    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'REFERRAL_SENT',
        entityType: 'CaseIncident',
        entityId: id,
        changes: { referralTarget: rec.referralTarget } as any,
      },
    });
    return updated;
  }

  /** Record follow-up and close or continue monitoring. */
  async followUp(caseId: string, userId: string, id: string, dto: FollowUpDto) {
    await this.get(caseId, id);
    const status = dto.action === 'close' ? IncidentStatus.CLOSED : IncidentStatus.CONTINUED;
    return this.prisma.caseIncident.update({
      where: { id },
      data: {
        followUpOutcome: dto.outcome,
        status,
        ...(dto.action === 'close' ? { closedAt: new Date(), closedById: userId } : {}),
      },
    });
  }
}
