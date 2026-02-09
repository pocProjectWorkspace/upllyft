import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConsentType } from '@prisma/client';
import { CreateCaseConsentDto, ListConsentsQueryDto } from './dto/case-consents.dto';

@Injectable()
export class CaseConsentsService {
  constructor(private prisma: PrismaService) {}

  async createConsent(caseId: string, userId: string, dto: CreateCaseConsentDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // Check for existing active consent of same type
    const existing = await this.prisma.caseConsent.findFirst({
      where: {
        caseId,
        type: dto.type,
        grantedById: userId,
        revokedAt: null,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
    });
    if (existing) {
      throw new BadRequestException(`Active ${dto.type} consent already exists`);
    }

    const consent = await this.prisma.caseConsent.create({
      data: {
        caseId,
        type: dto.type,
        grantedById: userId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
      include: {
        grantedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CONSENT_GRANTED',
        entityType: 'CaseConsent',
        entityId: consent.id,
        changes: { type: dto.type },
      },
    });

    return consent;
  }

  async listConsents(caseId: string, query: ListConsentsQueryDto) {
    const where: Prisma.CaseConsentWhereInput = { caseId };
    if (query.type) where.type = query.type;

    const consents = await this.prisma.caseConsent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        grantedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Annotate with computed status
    return consents.map((c) => ({
      ...c,
      isActive: !c.revokedAt && (!c.validUntil || c.validUntil > new Date()),
      isExpired: c.validUntil ? c.validUntil <= new Date() : false,
      isRevoked: !!c.revokedAt,
    }));
  }

  async revokeConsent(caseId: string, consentId: string, userId: string) {
    const consent = await this.prisma.caseConsent.findFirst({
      where: { id: consentId, caseId, revokedAt: null },
    });
    if (!consent) throw new NotFoundException('Active consent not found');

    await this.prisma.caseConsent.update({
      where: { id: consentId },
      data: { revokedAt: new Date() },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CONSENT_REVOKED',
        entityType: 'CaseConsent',
        entityId: consentId,
        changes: { type: consent.type },
      },
    });

    return { success: true };
  }

  /**
   * Check compliance: which required consents are missing or expired.
   */
  async getComplianceStatus(caseId: string) {
    const requiredTypes: ConsentType[] = ['TREATMENT', 'SHARING', 'ASSESSMENT'];

    const activeConsents = await this.prisma.caseConsent.findMany({
      where: {
        caseId,
        revokedAt: null,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
    });

    const activeTypes = new Set(activeConsents.map((c) => c.type));

    // Check for soon-to-expire consents (within 30 days)
    const soonExpiring = activeConsents.filter((c) => {
      if (!c.validUntil) return false;
      const daysUntilExpiry = (c.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 30;
    });

    return {
      isCompliant: requiredTypes.every((t) => activeTypes.has(t)),
      missing: requiredTypes.filter((t) => !activeTypes.has(t)),
      active: activeConsents.length,
      soonExpiring: soonExpiring.map((c) => ({
        id: c.id,
        type: c.type,
        validUntil: c.validUntil,
      })),
    };
  }
}
