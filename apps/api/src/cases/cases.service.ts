import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus, CaseTherapistRole, Prisma } from '@prisma/client';
import {
  CreateCaseDto,
  UpdateCaseStatusDto,
  AddCaseTherapistDto,
  UpdateCaseTherapistDto,
  TransferCaseDto,
  ListCasesQueryDto,
  CreateSessionDto,
  UpdateSessionDto,
} from './dto/cases.dto';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a unique case number: CM-YYYYMMDD-XXXX
   */
  private async generateCaseNumber(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const prefix = `CM-${dateStr}-`;

    const lastCase = await this.prisma.case.findFirst({
      where: { caseNumber: { startsWith: prefix } },
      orderBy: { caseNumber: 'desc' },
    });

    let seq = 1;
    if (lastCase) {
      const lastSeq = parseInt(lastCase.caseNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * Get children/patients that the therapist can create cases for.
   * These are children of parents who have booked sessions with this therapist.
   */
  async getTherapistPatients(therapistUserId: string, search?: string) {
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: therapistUserId },
    });
    if (!therapistProfile) {
      throw new BadRequestException('Therapist profile not found');
    }

    // Find unique parent user IDs from bookings with this therapist
    const bookings = await this.prisma.booking.findMany({
      where: {
        therapistId: therapistProfile.id,
        status: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST', 'PAYMENT_FAILED'] },
      },
      select: { patientId: true },
      distinct: ['patientId'],
    });

    const parentUserIds = bookings.map((b) => b.patientId);
    if (parentUserIds.length === 0) return [];

    // Get children of those parents
    const searchFilter: Prisma.ChildWhereInput = search
      ? { firstName: { contains: search, mode: 'insensitive' } }
      : {};

    const children = await this.prisma.child.findMany({
      where: {
        profile: { userId: { in: parentUserIds } },
        ...searchFilter,
      },
      include: {
        profile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        conditions: { select: { conditionType: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return children.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      nickname: child.nickname,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      parentId: child.profile.user.id,
      parentName: child.profile.user.name,
      parentEmail: child.profile.user.email,
      conditions: child.conditions.map((c) => c.conditionType),
    }));
  }

  /**
   * Create a new case. The requesting therapist becomes the primary therapist.
   */
  async createCase(therapistUserId: string, dto: CreateCaseDto) {
    // Verify therapist profile exists
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: therapistUserId },
    });
    if (!therapistProfile) {
      throw new BadRequestException('Therapist profile not found');
    }

    // Verify child exists
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
    });
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const caseNumber = await this.generateCaseNumber();

    const newCase = await this.prisma.case.create({
      data: {
        caseNumber,
        childId: dto.childId,
        primaryTherapistId: therapistProfile.id,
        organizationId: dto.organizationId,
        diagnosis: dto.diagnosis,
        referralSource: dto.referralSource,
        notes: dto.notes,
        therapists: {
          create: {
            therapistId: therapistProfile.id,
            role: CaseTherapistRole.PRIMARY,
            permissions: { canEdit: true, canViewNotes: true, canManageGoals: true },
          },
        },
      },
      include: {
        child: true,
        primaryTherapist: { include: { user: { select: { id: true, name: true, email: true } } } },
        therapists: {
          include: {
            therapist: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(newCase.id, therapistUserId, 'CREATED', 'Case', newCase.id);

    return newCase;
  }

  /**
   * List cases for the current therapist with optional filters.
   */
  async listCases(therapistUserId: string, query: ListCasesQueryDto) {
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: therapistUserId },
    });
    if (!therapistProfile) {
      throw new BadRequestException('Therapist profile not found');
    }

    const limit = parseInt(query.limit || '20', 10);
    const conditions: Prisma.CaseWhereInput[] = [
      {
        OR: [
          { primaryTherapistId: therapistProfile.id },
          {
            therapists: {
              some: {
                therapistId: therapistProfile.id,
                removedAt: null,
              },
            },
          },
        ],
      },
    ];

    if (query.status) conditions.push({ status: query.status });
    if (query.childId) conditions.push({ childId: query.childId });
    if (query.search) {
      conditions.push({
        OR: [
          { caseNumber: { contains: query.search, mode: 'insensitive' } },
          { child: { firstName: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.CaseWhereInput = { AND: conditions };

    const cases = await this.prisma.case.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        primaryTherapist: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            sessions: true,
            ieps: true,
            documents: true,
          },
        },
      },
    });

    const hasMore = cases.length > limit;
    const items = hasMore ? cases.slice(0, limit) : cases;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Get detailed case information.
   */
  async getCaseDetail(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: {
            conditions: true,
            profile: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
          },
        },
        primaryTherapist: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        therapists: {
          where: { removedAt: null },
          include: {
            therapist: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        },
        organization: { select: { id: true, name: true, logo: true } },
        _count: {
          select: {
            sessions: true,
            ieps: true,
            documents: true,
            milestonePlans: true,
            billingRecords: true,
          },
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');

    // Get latest IEP
    const latestIEP = await this.prisma.iEP.findFirst({
      where: { caseId, status: { in: ['ACTIVE', 'DRAFT'] } },
      orderBy: { version: 'desc' },
      include: {
        goals: { orderBy: { order: 'asc' } },
      },
    });

    // Get upcoming session
    const nextSession = await this.prisma.caseSession.findFirst({
      where: {
        caseId,
        scheduledAt: { gte: new Date() },
        attendanceStatus: 'PRESENT',
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Get recent sessions
    const recentSessions = await this.prisma.caseSession.findMany({
      where: { caseId },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      select: {
        id: true,
        scheduledAt: true,
        attendanceStatus: true,
        noteFormat: true,
        actualDuration: true,
      },
    });

    return {
      ...caseRecord,
      latestIEP,
      nextSession,
      recentSessions,
    };
  }

  /**
   * Update case status (discharge, archive, hold, reopen).
   */
  async updateCaseStatus(caseId: string, userId: string, dto: UpdateCaseStatusDto) {
    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Case not found');

    const data: Prisma.CaseUpdateInput = { status: dto.status };

    if (dto.status === CaseStatus.DISCHARGED) {
      data.dischargedAt = new Date();
      data.dischargeReason = dto.reason;
    }

    if (dto.status === CaseStatus.ACTIVE && existing.status === CaseStatus.ARCHIVED) {
      data.dischargedAt = null;
      data.dischargeReason = null;
    }

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data,
    });

    await this.createAuditLog(caseId, userId, 'STATUS_CHANGED', 'Case', caseId, {
      status: { old: existing.status, new: dto.status },
    });

    return updated;
  }

  /**
   * Add a therapist to a case.
   */
  async addTherapist(caseId: string, userId: string, dto: AddCaseTherapistDto) {
    // Check therapist exists
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { id: dto.therapistId },
    });
    if (!therapistProfile) throw new NotFoundException('Therapist not found');

    // Check not already assigned
    const existing = await this.prisma.caseTherapist.findUnique({
      where: { caseId_therapistId: { caseId, therapistId: dto.therapistId } },
    });
    if (existing && !existing.removedAt) {
      throw new BadRequestException('Therapist already assigned to this case');
    }

    // If previously removed, reactivate
    if (existing && existing.removedAt) {
      const updated = await this.prisma.caseTherapist.update({
        where: { id: existing.id },
        data: {
          removedAt: null,
          role: dto.role || CaseTherapistRole.SECONDARY,
          permissions: dto.permissions || { canEdit: false, canViewNotes: true, canManageGoals: false },
        },
        include: {
          therapist: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });

      await this.createAuditLog(caseId, userId, 'THERAPIST_ADDED', 'CaseTherapist', updated.id);
      return updated;
    }

    const assignment = await this.prisma.caseTherapist.create({
      data: {
        caseId,
        therapistId: dto.therapistId,
        role: dto.role || CaseTherapistRole.SECONDARY,
        permissions: dto.permissions || { canEdit: false, canViewNotes: true, canManageGoals: false },
      },
      include: {
        therapist: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    await this.createAuditLog(caseId, userId, 'THERAPIST_ADDED', 'CaseTherapist', assignment.id);
    return assignment;
  }

  /**
   * Update a therapist's role/permissions on a case.
   */
  async updateTherapist(
    caseId: string,
    therapistId: string,
    userId: string,
    dto: UpdateCaseTherapistDto,
  ) {
    const assignment = await this.prisma.caseTherapist.findUnique({
      where: { caseId_therapistId: { caseId, therapistId } },
    });
    if (!assignment || assignment.removedAt) {
      throw new NotFoundException('Therapist assignment not found');
    }

    const updated = await this.prisma.caseTherapist.update({
      where: { id: assignment.id },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.permissions && { permissions: dto.permissions }),
      },
      include: {
        therapist: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    await this.createAuditLog(caseId, userId, 'THERAPIST_UPDATED', 'CaseTherapist', updated.id);
    return updated;
  }

  /**
   * Remove a therapist from a case (soft delete).
   */
  async removeTherapist(caseId: string, therapistId: string, userId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    if (caseRecord.primaryTherapistId === therapistId) {
      throw new BadRequestException('Cannot remove primary therapist. Transfer case first.');
    }

    const assignment = await this.prisma.caseTherapist.findUnique({
      where: { caseId_therapistId: { caseId, therapistId } },
    });
    if (!assignment || assignment.removedAt) {
      throw new NotFoundException('Therapist assignment not found');
    }

    await this.prisma.caseTherapist.update({
      where: { id: assignment.id },
      data: { removedAt: new Date() },
    });

    await this.createAuditLog(caseId, userId, 'THERAPIST_REMOVED', 'CaseTherapist', assignment.id);
    return { success: true };
  }

  /**
   * Transfer primary therapist responsibility.
   */
  async transferCase(caseId: string, userId: string, dto: TransferCaseDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { therapists: { where: { removedAt: null } } },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const newPrimary = caseRecord.therapists.find(
      (t) => t.therapistId === dto.newPrimaryTherapistId,
    );
    if (!newPrimary) {
      throw new BadRequestException(
        'New primary therapist must be already assigned to the case',
      );
    }

    const oldPrimaryId = caseRecord.primaryTherapistId;

    await this.prisma.$transaction([
      // Update case primary therapist
      this.prisma.case.update({
        where: { id: caseId },
        data: { primaryTherapistId: dto.newPrimaryTherapistId },
      }),
      // Update new primary role
      this.prisma.caseTherapist.update({
        where: { id: newPrimary.id },
        data: {
          role: CaseTherapistRole.PRIMARY,
          permissions: { canEdit: true, canViewNotes: true, canManageGoals: true },
        },
      }),
      // Demote old primary to secondary
      this.prisma.caseTherapist.updateMany({
        where: {
          caseId,
          therapistId: oldPrimaryId,
          removedAt: null,
        },
        data: { role: CaseTherapistRole.SECONDARY },
      }),
    ]);

    await this.createAuditLog(caseId, userId, 'CASE_TRANSFERRED', 'Case', caseId, {
      primaryTherapist: { old: oldPrimaryId, new: dto.newPrimaryTherapistId },
    });

    return this.getCaseDetail(caseId);
  }

  /**
   * Get internal notes for a case.
   */
  async getInternalNotes(caseId: string) {
    return this.prisma.caseInternalNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });
  }

  /**
   * Add an internal note.
   */
  async addInternalNote(caseId: string, userId: string, content: string) {
    const note = await this.prisma.caseInternalNote.create({
      data: { caseId, authorId: userId, content },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    await this.createAuditLog(caseId, userId, 'NOTE_ADDED', 'CaseInternalNote', note.id);
    return note;
  }

  /**
   * Get case timeline (aggregated audit log).
   */
  async getCaseTimeline(caseId: string, cursor?: string, limit = 20) {
    const logs = await this.prisma.caseAuditLog.findMany({
      where: { caseId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  // ─── SESSION CRUD ──────────────────────────────────────────

  /**
   * List sessions for a case.
   */
  async listSessions(caseId: string) {
    return this.prisma.caseSession.findMany({
      where: { caseId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: {
            goal: { select: { id: true, goalText: true, domain: true } },
          },
        },
      },
    });
  }

  /**
   * Get a single session.
   */
  async getSession(caseId: string, sessionId: string) {
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: {
            goal: { select: { id: true, goalText: true, domain: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Create a new session note for a case.
   */
  async createSession(caseId: string, therapistUserId: string, dto: CreateSessionDto) {
    // Verify case exists
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const session = await this.prisma.caseSession.create({
      data: {
        caseId,
        therapistId: therapistUserId,
        scheduledAt: new Date(dto.scheduledAt),
        actualDuration: dto.actualDuration,
        attendanceStatus: dto.attendanceStatus || 'PRESENT',
        noteFormat: dto.noteFormat,
        sessionType: dto.sessionType,
        location: dto.location,
        bookingId: dto.bookingId,
        rawNotes: dto.rawNotes,
        structuredNotes: dto.structuredNotes
          ? (dto.structuredNotes as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
      },
    });

    await this.createAuditLog(caseId, therapistUserId, 'SESSION_CREATED', 'CaseSession', session.id);
    return session;
  }

  /**
   * Update a session note.
   */
  async updateSession(caseId: string, sessionId: string, userId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const updateData: Prisma.CaseSessionUpdateInput = {};
    if (dto.actualDuration !== undefined) updateData.actualDuration = dto.actualDuration;
    if (dto.attendanceStatus) updateData.attendanceStatus = dto.attendanceStatus;
    if (dto.noteFormat) updateData.noteFormat = dto.noteFormat;
    if (dto.sessionType !== undefined) updateData.sessionType = dto.sessionType;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.rawNotes !== undefined) updateData.rawNotes = dto.rawNotes;
    if (dto.structuredNotes !== undefined) {
      updateData.structuredNotes = dto.structuredNotes as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.caseSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: {
            goal: { select: { id: true, goalText: true, domain: true } },
          },
        },
      },
    });

    await this.createAuditLog(caseId, userId, 'SESSION_UPDATED', 'CaseSession', sessionId);
    return updated;
  }

  /**
   * Helper: create audit log entry.
   */
  private async createAuditLog(
    caseId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ) {
    await this.prisma.caseAuditLog.create({
      data: { caseId, userId, action, entityType, entityId, changes },
    });
  }
}
