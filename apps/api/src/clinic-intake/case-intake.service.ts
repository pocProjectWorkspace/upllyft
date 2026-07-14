import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentType, IntakeState, JourneyStage, Prisma } from '@prisma/client';
import { SaveCaseIntakeDto } from './dto/case-intake.dto';
import { grantConsent } from '../common/consent';

// Section E toggle → canonical ConsentType (write-through target)
const CONSENT_MAP: { flag: keyof SaveCaseIntakeDto; type: ConsentType }[] = [
  { flag: 'consentAssessment', type: ConsentType.ASSESSMENT },
  { flag: 'consentTherapy', type: ConsentType.TREATMENT },
  { flag: 'consentSharing', type: ConsentType.REPORT_SHARING },
  { flag: 'consentAi', type: ConsentType.DATA_PROCESSING },
];

@Injectable()
export class CaseIntakeService {
  constructor(private prisma: PrismaService) {}

  async getIntake(caseId: string) {
    return this.prisma.caseIntake.findUnique({ where: { caseId } });
  }

  /** Save draft — upsert without finalising. Never blocks; keeps editable. */
  async saveDraft(caseId: string, userId: string, dto: SaveCaseIntakeDto) {
    await this.assertCase(caseId);
    return this.upsert(caseId, userId, dto, IntakeState.DRAFT);
  }

  /**
   * Finalise the intake: build the summary, write consent flags through to
   * CaseConsent, flip state to SUMMARISED and advance the journey to Triage.
   */
  async summarise(caseId: string, userId: string, dto: SaveCaseIntakeDto) {
    const caseRecord = await this.assertCase(caseId);
    const record = await this.upsert(caseId, userId, dto, IntakeState.SUMMARISED, true);

    await this.writeConsentThrough(caseId, userId, dto);

    if (caseRecord.journeyStage === JourneyStage.INTAKE) {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { journeyStage: JourneyStage.TRIAGE },
      });
    }

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'INTAKE_SUMMARISED',
        entityType: 'CaseIntake',
        entityId: record.id,
      },
    });

    return record;
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async assertCase(caseId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { child: { select: { firstName: true, dateOfBirth: true, gender: true } } },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  private async upsert(
    caseId: string,
    userId: string,
    dto: SaveCaseIntakeDto,
    state: IntakeState,
    withSummary = false,
  ) {
    const base = {
      state,
      data: (dto.data ?? {}) as Prisma.InputJsonValue,
      presentingConcern: dto.presentingConcern,
      referralQuestions: dto.referralQuestions ?? [],
      parentGoals: dto.parentGoals ?? [],
      urgencyFlag: dto.urgencyFlag,
      consentAssessment: dto.consentAssessment ?? false,
      consentTherapy: dto.consentTherapy ?? false,
      consentSharing: dto.consentSharing ?? false,
      consentAi: dto.consentAi ?? false,
      recordedBy: dto.recordedBy,
    };

    const summary = withSummary ? await this.buildSummary(caseId, dto) : undefined;

    return this.prisma.caseIntake.upsert({
      where: { caseId },
      create: {
        caseId,
        createdById: userId,
        ...base,
        ...(withSummary ? { aiSummary: summary, summarisedAt: new Date() } : {}),
      },
      update: {
        ...base,
        ...(withSummary ? { aiSummary: summary, summarisedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Section-E toggles -> real consent records.
   *
   * Two things were wrong here and both mattered.
   *
   * 1. ATTRIBUTION. `grantedById: userId` recorded the STAFF MEMBER typing the form
   *    as the person who consented. Staff CAPTURE consent; the guardian GIVES it.
   *    The grant is now attributed to the child's guardian, with the staff member
   *    kept as `recordedBy` for audit. A consent record naming the wrong person is
   *    not a consent record.
   *
   * 2. It only wrote `CaseConsent`, which is keyed to a Case — so it produced
   *    nothing the facility-scoped gate can read, and nothing a nursery could ever
   *    produce. Now dual-writes `ChildConsent` (child + facility), which is what
   *    `resolveChildAccess` actually checks.
   */
  private async writeConsentThrough(caseId: string, userId: string, dto: SaveCaseIntakeDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        clinicId: true,
        childId: true,
        child: { select: { profile: { select: { userId: true } } } },
      },
    });
    if (!caseRecord) return;

    // The guardian is the person whose agreement this is.
    const guardianUserId = caseRecord.child?.profile?.userId;

    for (const { flag, type } of CONSENT_MAP) {
      const granted = dto[flag] as boolean | undefined;
      if (!granted) continue;

      const existing = await this.prisma.caseConsent.findFirst({
        where: { caseId, type, revokedAt: null },
      });
      if (!existing) {
        await this.prisma.caseConsent.create({
          data: {
            caseId,
            type,
            // The guardian's agreement — not the recorder's.
            grantedById: guardianUserId ?? userId,
            purpose: 'Captured at client intake (Section E)',
            notes: `Recorded by staff user ${userId}`,
          },
        });
      }

      // The record the facility-scoped gate actually reads.
      if (guardianUserId && caseRecord.clinicId) {
        await grantConsent(this.prisma, {
          childId: caseRecord.childId,
          facilityId: caseRecord.clinicId, // Facility.id = Clinic.id
          type,
          purpose: 'Captured at client intake (Section E)',
          grantedByUserId: guardianUserId,
          recordedByUserId: userId,
          caseId,
        });
      }
    }
  }

  /** Deterministic, always-available intake summary (AI-upgradeable). */
  private async buildSummary(caseId: string, dto: SaveCaseIntakeDto): Promise<string> {
    const c = await this.assertCase(caseId);
    const name = c.child?.firstName ?? 'The client';
    const age = c.child?.dateOfBirth ? this.ageLabel(c.child.dateOfBirth) : null;
    const parts: string[] = [];
    parts.push(
      `${name}${age ? `, ${age}` : ''}${c.child?.gender ? ` (${c.child.gender.toLowerCase()})` : ''}.`,
    );
    if (dto.referralQuestions?.length) {
      parts.push(`Referred for ${dto.referralQuestions.join(', ').toLowerCase()}.`);
    }
    if (dto.presentingConcern) parts.push(`Presenting concern: ${dto.presentingConcern.trim()}`);
    if (dto.parentGoals?.length) {
      parts.push(`Parent goals: ${dto.parentGoals.join('; ')}.`);
    }
    if (dto.urgencyFlag) parts.push(`Urgency: ${dto.urgencyFlag}.`);
    return parts.join(' ');
  }

  private ageLabel(dob: Date): string {
    const now = new Date();
    const months =
      (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (months < 24) return `${months} months old`;
    return `${Math.floor(months / 12)} years old`;
  }
}
