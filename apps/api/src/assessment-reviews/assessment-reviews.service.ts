import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssessmentPhase,
  ConsentType,
  JourneyStage,
  Prisma,
  TherapyDiscipline,
} from '@prisma/client';
import {
  CreateAssessmentReviewDto,
  UpdateAssessmentReviewDto,
  AddDisciplineDto,
  UpdateDisciplineDto,
  ShareReportDto,
} from './dto/assessment-reviews.dto';

const DISCIPLINE_LABEL: Record<string, string> = {
  SPEECH: 'Speech & Language',
  OCCUPATIONAL: 'Occupational Therapy',
  PSYCHOLOGY: 'Psychology',
  BEHAVIOUR_ABA: 'Behaviour (ABA)',
  SPECIAL_EDUCATION: 'Special Education',
  PHYSIOTHERAPY: 'Physiotherapy',
  MEDICAL: 'Medical',
  MULTIDISCIPLINARY: 'Multidisciplinary',
  UNIVERSAL: 'Universal',
};

@Injectable()
export class AssessmentReviewsService {
  constructor(private prisma: PrismaService) {}

  private disciplinesInclude = {
    disciplines: { orderBy: { createdAt: 'asc' as const } },
  };

  async list(caseId: string) {
    return this.prisma.assessmentReview.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: this.disciplinesInclude,
    });
  }

  async get(caseId: string, id: string) {
    const review = await this.prisma.assessmentReview.findFirst({
      where: { id, caseId },
      include: this.disciplinesInclude,
    });
    if (!review) throw new NotFoundException('Assessment review not found');
    return review;
  }

  async create(caseId: string, userId: string, dto: CreateAssessmentReviewDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const review = await this.prisma.assessmentReview.create({
      data: {
        caseId,
        createdById: userId,
        type: dto.type,
        title: dto.title,
        phase: AssessmentPhase.PLAN,
        disciplines: {
          create: dto.disciplines.map((d) => ({ discipline: d })),
        },
      },
      include: this.disciplinesInclude,
    });

    if (
      caseRecord.journeyStage === JourneyStage.CONSULTATION ||
      caseRecord.journeyStage === JourneyStage.TRIAGE ||
      caseRecord.journeyStage === JourneyStage.INTAKE
    ) {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { journeyStage: JourneyStage.IN_ASSESSMENT },
      });
    }
    return review;
  }

  async update(caseId: string, id: string, dto: UpdateAssessmentReviewDto) {
    await this.get(caseId, id);
    return this.prisma.assessmentReview.update({
      where: { id },
      data: {
        ...(dto.phase !== undefined && { phase: dto.phase }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.scopeText !== undefined && { scopeText: dto.scopeText }),
        ...(dto.scopeApproved !== undefined && { scopeApproved: dto.scopeApproved }),
        ...(dto.dayMode !== undefined && { dayMode: dto.dayMode }),
        ...(dto.questionnaireSent !== undefined && { questionnaireSent: dto.questionnaireSent }),
        ...(dto.schoolInputRequested !== undefined && {
          schoolInputRequested: dto.schoolInputRequested,
        }),
        ...(dto.paymentStatus !== undefined && { paymentStatus: dto.paymentStatus }),
        ...(dto.meetingAt !== undefined && { meetingAt: new Date(dto.meetingAt) }),
        ...(dto.syncMode !== undefined && { syncMode: dto.syncMode }),
        ...(dto.reportText !== undefined && { reportText: dto.reportText }),
        ...(dto.approval !== undefined && { approval: dto.approval }),
      },
      include: this.disciplinesInclude,
    });
  }

  /** Flag a concern: live-add a discipline to the scope (persisted, not localStorage). */
  async addDiscipline(caseId: string, id: string, dto: AddDisciplineDto) {
    await this.get(caseId, id);
    const existing = await this.prisma.assessmentDiscipline.findUnique({
      where: { assessmentReviewId_discipline: { assessmentReviewId: id, discipline: dto.discipline } },
    });
    if (existing) return this.get(caseId, id);
    await this.prisma.assessmentDiscipline.create({
      data: {
        assessmentReviewId: id,
        discipline: dto.discipline,
        flagged: dto.flagged ?? true,
      },
    });
    return this.get(caseId, id);
  }

  async updateDiscipline(caseId: string, id: string, disciplineRowId: string, dto: UpdateDisciplineDto) {
    await this.get(caseId, id);
    await this.prisma.assessmentDiscipline.update({
      where: { id: disciplineRowId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignee !== undefined && { assignee: dto.assignee }),
        ...(dto.clinicalRecordId !== undefined && { clinicalRecordId: dto.clinicalRecordId }),
        ...(dto.reportTitle !== undefined && { reportTitle: dto.reportTitle }),
      },
    });
    return this.get(caseId, id);
  }

  /** Deterministic consolidated MDT report draft (AI-upgradeable). */
  async draftReport(caseId: string, id: string) {
    const review = await this.get(caseId, id);
    const lines: string[] = ['# Consolidated assessment report', ''];
    for (const d of review.disciplines) {
      lines.push(`## ${DISCIPLINE_LABEL[d.discipline] ?? d.discipline}`);
      lines.push(
        d.status === 'SUBMITTED'
          ? `Findings submitted${d.reportTitle ? ` — ${d.reportTitle}` : ''}. Clinician review confirms domain-level results are consistent with the presenting concern.`
          : `Assessment ${d.status.toLowerCase().replace('_', ' ')}; findings pending.`,
      );
      lines.push('');
    }
    lines.push('## Summary & recommendations');
    lines.push(
      'The multidisciplinary team recommends a coordinated intervention plan drawing on the disciplines assessed above, with review at the agreed interval.',
    );
    const reportText = lines.join('\n');
    return this.prisma.assessmentReview.update({
      where: { id },
      data: { reportText },
      include: this.disciplinesInclude,
    });
  }

  /**
   * Share the report. Consent-gated: external recipients (school/doctor) require
   * an active REPORT_SHARING consent on the case (from Client Intake Section E).
   */
  async share(caseId: string, userId: string, id: string, dto: ShareReportDto) {
    const review = await this.get(caseId, id);
    if (review.approval !== 'approved') {
      throw new BadRequestException('Report must be approved before sharing');
    }
    const wantsExternal = !!(dto.recipients.school || dto.recipients.doctor);
    if (wantsExternal) {
      const consent = await this.prisma.caseConsent.findFirst({
        where: { caseId, type: ConsentType.REPORT_SHARING, revokedAt: null },
      });
      if (!consent) {
        throw new BadRequestException(
          'Report-sharing consent is required to share with external recipients. Capture it at Client Intake (Section E).',
        );
      }
    }
    const updated = await this.prisma.assessmentReview.update({
      where: { id },
      data: {
        phase: AssessmentPhase.SHARED,
        sharedAt: new Date(),
        recipients: dto.recipients as Prisma.InputJsonValue,
      },
      include: this.disciplinesInclude,
    });
    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'ASSESSMENT_REPORT_SHARED',
        entityType: 'AssessmentReview',
        entityId: id,
        changes: dto.recipients as any,
      },
    });
    return updated;
  }
}
