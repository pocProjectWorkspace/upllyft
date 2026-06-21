import { Injectable, NotFoundException } from '@nestjs/common';
import { TriageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePathwayTemplateDto,
  CreateTriageReviewDto,
  DecideTriageDto,
} from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): clinical triage + care pathways. A clinical lead reviews
 * intake/risk and assigns a pathway; the pathway template declares which
 * forms/tasks/appointments to generate downstream.
 */
@Injectable()
export class TriageService {
  constructor(private prisma: PrismaService) {}

  // ── Pathway templates ──
  listPathways(clinicId?: string) {
    return this.prisma.pathwayTemplate.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  createPathway(dto: CreatePathwayTemplateDto) {
    return this.prisma.pathwayTemplate.create({
      data: {
        name: dto.name,
        clinicId: dto.clinicId,
        serviceCodes: dto.serviceCodes ?? [],
        generates: dto.generates ?? {},
      },
    });
  }

  // ── Triage reviews ──
  listTriage(caseId: string) {
    return this.prisma.triageReview.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(reviewedById: string, dto: CreateTriageReviewDto) {
    return this.prisma.triageReview.create({
      data: {
        caseId: dto.caseId,
        leadId: dto.leadId,
        reviewedById,
        aiSummary: dto.aiSummary,
        riskLevel: dto.riskLevel,
        notes: dto.notes,
      },
    });
  }

  async decide(triageId: string, dto: DecideTriageDto) {
    const triage = await this.prisma.triageReview.findUnique({ where: { id: triageId } });
    if (!triage) throw new NotFoundException('Triage review not found');
    const updated = await this.prisma.triageReview.update({
      where: { id: triageId },
      data: {
        status: TriageStatus.DECIDED,
        decision: dto.decision,
        riskLevel: dto.riskLevel ?? triage.riskLevel,
        pathwayTemplateId: dto.pathwayTemplateId,
        notes: dto.notes ?? triage.notes,
      },
    });
    // Record the chosen pathway on the case so downstream generation can use it.
    if (dto.pathwayTemplateId && triage.caseId) {
      await this.prisma.case.update({
        where: { id: triage.caseId },
        data: { pathwayTemplateId: dto.pathwayTemplateId },
      });
    }
    return updated;
  }

  acknowledge(triageId: string) {
    return this.prisma.triageReview.update({
      where: { id: triageId },
      data: { acknowledgedByGuardianAt: new Date() },
    });
  }
}
