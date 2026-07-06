import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  JourneyStage,
  TriageStatus,
  TriageDecision,
  CaseTherapistRole,
  Prisma,
} from '@prisma/client';
import { ConfirmTriageDto } from './dto/case-triage.dto';

const CASELOAD_CAPACITY = 20; // configurable target caseload per therapist

@Injectable()
export class CaseTriageService {
  constructor(private prisma: PrismaService) {}

  /** Latest triage review for the case (the one the spine edits). */
  async getCurrent(caseId: string) {
    return this.prisma.triageReview.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Smart-matched therapist candidates, ranked by language match, age-band
   * expertise, and current caseload. Scoped to the case's clinic when set.
   */
  async getCandidates(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        clinic: { select: { id: true } },
        intake: { select: { data: true } },
        child: { select: { id: true } },
      },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // Target languages from the intake record (Section A · languages), if captured.
    const intakeData = (caseRecord.intake?.data as Record<string, any>) ?? {};
    const targetLangs = String(intakeData.languages ?? '')
      .split(/[,/]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const therapists = await this.prisma.therapistProfile.findMany({
      where: {
        isActive: true,
        ...(caseRecord.clinicId ? { clinicId: caseRecord.clinicId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { primaryCases: true, caseAssignments: true } },
      },
      take: 30,
    });

    const scored = therapists.map((t) => {
      const caseload = (t._count?.primaryCases ?? 0) + (t._count?.caseAssignments ?? 0);
      const caseloadPct = Math.min(100, Math.round((caseload / CASELOAD_CAPACITY) * 100));
      const tLangs = t.languages.map((l) => l.toLowerCase());
      const languageMatch = targetLangs.length
        ? targetLangs.some((l) => tLangs.some((tl) => tl.includes(l) || l.includes(tl)))
        : false;
      const ageExpertise = t.specializations.length > 0;
      const openSlots = Math.max(0, CASELOAD_CAPACITY - caseload);
      const score =
        (languageMatch ? 3 : 0) +
        (ageExpertise ? 2 : 0) +
        (100 - caseloadPct) / 100;
      return {
        id: t.id,
        userId: t.user.id,
        name: t.user.name,
        image: t.user.image,
        discipline: t.specializations[0] ?? t.title ?? 'Therapist',
        languages: t.languages,
        languageMatch,
        languageLabel: t.languages.slice(0, 2).join(' / ') || '—',
        ageExpertise,
        ageLabel: t.specializations[0] ?? '—',
        caseloadPct,
        openSlots,
        conflictOfInterest: false, // relationship data not modelled yet
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((c, i) => ({ ...c, bestMatch: i === 0 && c.score > 0 }));
  }

  /**
   * Confirm triage: persist the full decision spine, assign the care team,
   * optionally book the first appointment, and advance the journey.
   */
  async confirm(caseId: string, userId: string, dto: ConfirmTriageDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // Find the working triage review or create one.
    let triage = await this.prisma.triageReview.findFirst({
      where: { caseId, status: { not: TriageStatus.DECIDED } },
      orderBy: { createdAt: 'desc' },
    });

    const decisionData = {
      primaryTherapistId: dto.primaryTherapistId ?? null,
      secondaryTherapistIds: dto.secondaryTherapistIds ?? [],
      appointment: dto.appointment ?? null,
      notify: dto.notify ?? null,
      riskFlags: dto.riskFlags ?? {},
    } as Prisma.InputJsonValue;

    const data = {
      status: TriageStatus.DECIDED,
      decision: dto.decision,
      riskLevel: dto.riskLevel ?? undefined,
      pathway: dto.pathway ?? undefined,
      aiSummary: dto.aiSummary ?? undefined,
      notes: dto.notes ?? undefined,
      decisionData,
      confirmedAt: new Date(),
    };

    triage = triage
      ? await this.prisma.triageReview.update({ where: { id: triage.id }, data })
      : await this.prisma.triageReview.create({
          data: { caseId, reviewedById: userId, ...data },
        });

    // Assign care team (only for accept/proceed decisions)
    if (dto.decision === TriageDecision.PROCEED) {
      await this.assignTeam(caseId, dto.primaryTherapistId, dto.secondaryTherapistIds ?? []);
      await this.maybeBookFirstAppointment(caseId, dto);
      if (
        caseRecord.journeyStage === JourneyStage.INTAKE ||
        caseRecord.journeyStage === JourneyStage.TRIAGE
      ) {
        await this.prisma.case.update({
          where: { id: caseId },
          data: { journeyStage: JourneyStage.CONSULTATION },
        });
      }
    }

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'TRIAGE_CONFIRMED',
        entityType: 'TriageReview',
        entityId: triage.id,
        changes: { decision: dto.decision, pathway: dto.pathway } as any,
      },
    });

    return triage;
  }

  private async assignTeam(
    caseId: string,
    primaryTherapistId?: string,
    secondaryIds: string[] = [],
  ) {
    const assign = async (therapistId: string, role: CaseTherapistRole) => {
      await this.prisma.caseTherapist.upsert({
        where: { caseId_therapistId: { caseId, therapistId } },
        create: {
          caseId,
          therapistId,
          role,
          permissions: { canEdit: true } as Prisma.InputJsonValue,
        },
        update: { role, removedAt: null, permissions: { canEdit: true } as Prisma.InputJsonValue },
      });
    };

    if (primaryTherapistId) {
      await assign(primaryTherapistId, CaseTherapistRole.PRIMARY);
      await this.prisma.case.update({
        where: { id: caseId },
        data: { primaryTherapistId },
      });
    }
    for (const id of secondaryIds) {
      if (id && id !== primaryTherapistId) await assign(id, CaseTherapistRole.SECONDARY);
    }
  }

  private async maybeBookFirstAppointment(caseId: string, dto: ConfirmTriageDto) {
    const appt = dto.appointment;
    if (!appt?.scheduledAt || !dto.primaryTherapistId) return;
    const profile = await this.prisma.therapistProfile.findUnique({
      where: { id: dto.primaryTherapistId },
      select: { userId: true },
    });
    if (!profile) return;
    await this.prisma.caseSession.create({
      data: {
        caseId,
        therapistId: profile.userId,
        scheduledAt: new Date(appt.scheduledAt),
        sessionType: appt.type ?? 'Initial appointment',
        location: appt.location,
        actualDuration: appt.durationMin,
        noteStatus: 'DRAFT',
      },
    });
  }
}
