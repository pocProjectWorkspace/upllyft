import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import {
  CreateClinicalRecordDto,
  UpdateClinicalRecordDto,
  ListClinicalRecordsQueryDto,
} from './dto/clinical-records.dto';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private recordInclude = {
    template: { select: { id: true, code: true, name: true, schema: true } },
    therapist: { select: { id: true, name: true, image: true } },
  };

  /**
   * Build the pre-populated header values from the child profile + intake +
   * logged-in clinician, keyed by ClinicalPrefillKey. Returned to the client so
   * the dynamic form can seed identifier fields before capture.
   */
  async getPrefill(caseId: string, authorUserId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: {
            guardians: {
              orderBy: { isPrimaryContact: 'desc' },
              take: 1,
            },
            profile: {
              select: {
                fullName: true,
                relationshipToChild: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const author = await this.prisma.user.findUnique({
      where: { id: authorUserId },
      select: { name: true, role: true },
    });

    const child = caseRecord.child;
    const guardian = child?.guardians?.[0];
    const profile = child?.profile;

    const caregiver =
      guardian
        ? [guardian.fullName, guardian.relationship, guardian.phone, guardian.email]
            .filter(Boolean)
            .join(', ')
        : profile
          ? [profile.fullName, profile.relationshipToChild, profile.phoneNumber, profile.email]
              .filter(Boolean)
              .join(', ')
          : undefined;

    const authorRole =
      author?.role === 'EDUCATOR'
        ? 'Special Educator'
        : author?.role === 'THERAPIST'
          ? 'Therapist'
          : 'Therapist';

    return {
      clientFullName: [child?.firstName, child?.nickname ? `(${child.nickname})` : null]
        .filter(Boolean)
        .join(' '),
      clientMrn: caseRecord.caseNumber,
      dateOfBirth: child?.dateOfBirth ?? null,
      age: child?.dateOfBirth ? this.calculateAge(child.dateOfBirth) : null,
      gender: child?.gender ?? null,
      parentCaregiver: caregiver ?? null,
      primaryLanguages: child?.primaryLanguage ?? child?.mediumOfInstruction ?? null,
      schoolOrganisation: child?.currentSchool ?? null,
      referralSource: caseRecord.referralSource ?? child?.referralSource ?? null,
      recordAuthor: author?.name ?? null,
      authorRole,
      dateTimeLocation: new Date(),
      diagnosis: caseRecord.diagnosis ?? null,
      curriculumGrade: child?.grade ?? null,
      nationality: child?.nationality ?? null,
    };
  }

  async create(caseId: string, therapistUserId: string, dto: CreateClinicalRecordDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: { select: { profile: { select: { userId: true } } } },
      },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // PDPL: require signed parent consent before capturing clinical records.
    const parentUserId = caseRecord.child?.profile?.userId;
    if (parentUserId) {
      const signedConsent = await this.prisma.consentForm.findFirst({
        where: { patientId: parentUserId, status: 'SIGNED' },
      });
      if (!signedConsent) {
        throw new ForbiddenException(
          'A signed consent form is required before creating clinical records.',
        );
      }
    }

    const template = await this.prisma.clinicalTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException('Clinical template not found');

    const record = await this.prisma.clinicalRecord.create({
      data: {
        caseId,
        templateId: template.id,
        templateCode: template.code,
        templateVersion: template.version,
        discipline: template.discipline,
        activityType: template.activityType,
        therapistId: therapistUserId,
        title: dto.title?.trim() || template.name,
        answers: (dto.answers ?? {}) as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
      include: this.recordInclude,
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId: therapistUserId,
        action: 'CLINICAL_RECORD_CREATED',
        entityType: 'ClinicalRecord',
        entityId: record.id,
      },
    });

    return record;
  }

  async list(caseId: string, query: ListClinicalRecordsQueryDto) {
    const limit = parseInt(query.limit || '20', 10);
    const where: Prisma.ClinicalRecordWhereInput = { caseId };
    if (query.activityType) where.activityType = query.activityType;
    if (query.discipline) where.discipline = query.discipline;
    if (query.status) where.status = query.status;

    const records = await this.prisma.clinicalRecord.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, code: true, name: true } },
        therapist: { select: { id: true, name: true, image: true } },
      },
    });

    const hasMore = records.length > limit;
    const items = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return { items, nextCursor, hasMore };
  }

  async get(caseId: string, recordId: string, accessorUserId?: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
      include: this.recordInclude,
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    if (accessorUserId) {
      this.auditService.log({
        userId: accessorUserId,
        resourceType: 'ClinicalRecord',
        resourceId: recordId,
        action: 'READ',
      });
    }
    return record;
  }

  async update(
    caseId: string,
    recordId: string,
    userId: string,
    dto: UpdateClinicalRecordDto,
  ) {
    const existing = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
    });
    if (!existing) throw new NotFoundException('Clinical record not found');
    if (existing.status === 'SIGNED') {
      throw new ForbiddenException(
        'This record is signed and locked. Create an amendment instead.',
      );
    }

    const record = await this.prisma.clinicalRecord.update({
      where: { id: recordId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.answers !== undefined
          ? { answers: dto.answers as Prisma.InputJsonValue }
          : {}),
      },
      include: this.recordInclude,
    });
    return record;
  }

  /** Sign & lock the record. */
  async sign(caseId: string, recordId: string, userId: string, signatureName?: string) {
    const existing = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
    });
    if (!existing) throw new NotFoundException('Clinical record not found');
    if (existing.status === 'SIGNED') return existing;

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const record = await this.prisma.clinicalRecord.update({
      where: { id: recordId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signatureName: signatureName || author?.name || 'Clinician',
      },
      include: this.recordInclude,
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CLINICAL_RECORD_SIGNED',
        entityType: 'ClinicalRecord',
        entityId: recordId,
      },
    });
    return record;
  }

  async remove(caseId: string, recordId: string, userId: string) {
    const existing = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
    });
    if (!existing) throw new NotFoundException('Clinical record not found');
    if (existing.status === 'SIGNED') {
      throw new ForbiddenException('Signed records cannot be deleted.');
    }
    await this.prisma.clinicalRecord.delete({ where: { id: recordId } });
    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CLINICAL_RECORD_DELETED',
        entityType: 'ClinicalRecord',
        entityId: recordId,
      },
    });
    return { success: true };
  }

  private calculateAge(dob: Date): string {
    const now = new Date();
    const years = now.getFullYear() - dob.getFullYear();
    const months = now.getMonth() - dob.getMonth();
    const totalMonths = years * 12 + months - (now.getDate() < dob.getDate() ? 1 : 0);
    if (totalMonths < 24) return `${totalMonths} months`;
    return `${Math.floor(totalMonths / 12)} years ${totalMonths % 12} months`;
  }
}
