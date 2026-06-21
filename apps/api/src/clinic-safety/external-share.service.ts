import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConsentType } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CaseConsentsService } from '../case-consents/case-consents.service';
import { CreateExternalShareDto } from './dto/safety.dto';

/**
 * Phase 4 (UAE): consent-gated, time-bound external sharing (referral-out,
 * school/insurer release). Every share requires an active SHARING/REPORT_SHARING
 * consent, carries a single-purpose token, expires, and is access-logged.
 */
@Injectable()
export class ExternalShareService {
  constructor(
    private prisma: PrismaService,
    private consents: CaseConsentsService,
  ) {}

  list(caseId: string) {
    return this.prisma.externalShare.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createdById: string, dto: CreateExternalShareDto) {
    // Must have active sharing consent for this case.
    await this.consents.assertActiveConsent(dto.caseId, [
      ConsentType.SHARING,
      ConsentType.REPORT_SHARING,
    ]);

    const days = dto.expiresInDays ?? 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return this.prisma.externalShare.create({
      data: {
        caseId: dto.caseId,
        recipientName: dto.recipientName,
        recipientType: dto.recipientType,
        consentId: dto.consentId,
        token: crypto.randomBytes(24).toString('hex'),
        expiresAt,
        createdById,
      },
    });
  }

  async revoke(id: string) {
    const share = await this.prisma.externalShare.findUnique({ where: { id } });
    if (!share) throw new NotFoundException('External share not found');
    return this.prisma.externalShare.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /** Resolve a token for an external recipient — validates + logs the access. */
  async access(token: string) {
    const share = await this.prisma.externalShare.findUnique({ where: { token } });
    if (!share || share.revokedAt) throw new NotFoundException('Share not found or revoked');
    if (share.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('This external share link has expired');
    }
    await this.prisma.externalShare.update({
      where: { token },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });
    return {
      caseId: share.caseId,
      recipientName: share.recipientName,
      recipientType: share.recipientType,
      expiresAt: share.expiresAt,
    };
  }
}
