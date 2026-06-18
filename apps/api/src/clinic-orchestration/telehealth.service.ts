import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CaseConsentsService } from '../case-consents/case-consents.service';
import { RecordTelehealthDto } from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): telehealth encounter metadata (DHA telehealth standard).
 * Captured per session and gated on an active TELEHEALTH consent.
 */
@Injectable()
export class TelehealthService {
  constructor(
    private prisma: PrismaService,
    private consents: CaseConsentsService,
  ) {}

  async record(sessionId: string, dto: RecordTelehealthDto) {
    const session = await this.prisma.caseSession.findUnique({
      where: { id: sessionId },
      select: { id: true, caseId: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    // A telehealth encounter may only be recorded with active telehealth consent.
    await this.consents.assertActiveConsent(session.caseId, [ConsentType.TELEHEALTH]);

    return this.prisma.telehealthEncounter.upsert({
      where: { sessionId },
      create: {
        sessionId,
        platform: dto.platform,
        clinicianLicence: dto.clinicianLicence,
        clinicianLocation: dto.clinicianLocation,
        patientLocation: dto.patientLocation,
        telehealthConsentId: dto.telehealthConsentId,
        startedAt: new Date(),
      },
      update: {
        platform: dto.platform,
        clinicianLicence: dto.clinicianLicence,
        clinicianLocation: dto.clinicianLocation,
        patientLocation: dto.patientLocation,
        telehealthConsentId: dto.telehealthConsentId,
      },
    });
  }

  async end(sessionId: string) {
    const enc = await this.prisma.telehealthEncounter.findUnique({ where: { sessionId } });
    if (!enc) throw new NotFoundException('Telehealth encounter not found');
    return this.prisma.telehealthEncounter.update({
      where: { sessionId },
      data: { endedAt: new Date() },
    });
  }
}
