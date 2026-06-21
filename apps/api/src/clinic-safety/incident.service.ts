import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto, UpdateIncidentDto, CloseIncidentDto } from './dto/safety.dto';

/**
 * Phase 4 (UAE): incident / escalation / safeguarding. Startable from any
 * module, routed by urgency, owned, and tracked to closure.
 */
@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  /** List incidents — by case, by status, or just the open ones (default). */
  list(opts: { caseId?: string; status?: IncidentStatus; openOnly?: boolean }) {
    const where: any = {};
    if (opts.caseId) where.caseId = opts.caseId;
    if (opts.status) where.status = opts.status;
    else if (opts.openOnly) where.status = { not: IncidentStatus.CLOSED };
    return this.prisma.caseIncident.findMany({
      where,
      orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(raisedById: string, dto: CreateIncidentDto) {
    return this.prisma.caseIncident.create({
      data: {
        raisedById,
        caseId: dto.caseId,
        childId: dto.childId,
        raisedFromModule: dto.raisedFromModule,
        category: dto.category,
        urgency: dto.urgency,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const incident = await this.prisma.caseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    return this.prisma.caseIncident.update({
      where: { id },
      data: {
        status: dto.status,
        ownerId: dto.ownerId,
        clinicalDecision: dto.clinicalDecision,
        actionPlan: dto.actionPlan,
      },
    });
  }

  async close(id: string, closedById: string, dto: CloseIncidentDto) {
    const incident = await this.prisma.caseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    return this.prisma.caseIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.CLOSED,
        closedAt: new Date(),
        closedById,
        actionPlan: dto.actionPlan ?? incident.actionPlan,
      },
    });
  }
}
