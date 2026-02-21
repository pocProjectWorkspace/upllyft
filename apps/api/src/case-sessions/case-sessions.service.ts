import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCaseSessionDto,
  UpdateCaseSessionDto,
  LogGoalProgressDto,
  BulkLogGoalProgressDto,
  ListCaseSessionsQueryDto,
} from './dto/case-sessions.dto';

@Injectable()
export class CaseSessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new session record for a case.
   */
  async createSession(caseId: string, therapistUserId: string, dto: CreateCaseSessionDto) {
    // Verify case exists
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    // If linking to a booking, verify it exists and isn't already linked
    if (dto.bookingId) {
      const existingLink = await this.prisma.caseSession.findUnique({
        where: { bookingId: dto.bookingId },
      });
      if (existingLink) {
        throw new BadRequestException('This booking is already linked to a session');
      }
    }

    const session = await this.prisma.caseSession.create({
      data: {
        caseId,
        therapistId: therapistUserId,
        scheduledAt: new Date(dto.scheduledAt),
        bookingId: dto.bookingId,
        sessionType: dto.sessionType,
        location: dto.location,
        actualDuration: dto.actualDuration,
        attendanceStatus: dto.attendanceStatus,
        rawNotes: dto.rawNotes,
        noteFormat: dto.noteFormat,
        structuredNotes: dto.structuredNotes as any,
        noteStatus: 'DRAFT',
      },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: { goal: { select: { id: true, goalText: true, domain: true } } },
        },
      },
    });

    // Audit log
    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId: therapistUserId,
        action: 'SESSION_CREATED',
        entityType: 'CaseSession',
        entityId: session.id,
      },
    });

    return session;
  }

  /**
   * List sessions for a case with pagination.
   */
  async listSessions(caseId: string, query: ListCaseSessionsQueryDto) {
    const limit = parseInt(query.limit || '20', 10);
    const where: Prisma.CaseSessionWhereInput = { caseId };

    if (query.attendanceStatus) {
      where.attendanceStatus = query.attendanceStatus;
    }

    const sessions = await this.prisma.caseSession.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { scheduledAt: 'desc' },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: { goal: { select: { id: true, goalText: true, domain: true } } },
        },
        billing: { select: { id: true, status: true, amount: true } },
      },
    });

    const hasMore = sessions.length > limit;
    const items = hasMore ? sessions.slice(0, limit) : sessions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Get a single session with full details.
   */
  async getSession(caseId: string, sessionId: string) {
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: {
            goal: {
              select: { id: true, goalText: true, domain: true, currentProgress: true, status: true },
            },
          },
        },
        billing: true,
        booking: {
          select: {
            id: true,
            startDateTime: true,
            endDateTime: true,
            status: true,
            googleMeetLink: true,
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Update session (notes, attendance, duration).
   * Throws ForbiddenException if session is already signed.
   */
  async updateSession(caseId: string, sessionId: string, userId: string, dto: UpdateCaseSessionDto) {
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.noteStatus === 'SIGNED') {
      throw new ForbiddenException('Cannot edit a signed session note');
    }

    const updated = await this.prisma.caseSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.actualDuration !== undefined && { actualDuration: dto.actualDuration }),
        ...(dto.attendanceStatus && { attendanceStatus: dto.attendanceStatus }),
        ...(dto.rawNotes !== undefined && { rawNotes: dto.rawNotes }),
        ...(dto.noteFormat && { noteFormat: dto.noteFormat }),
        ...(dto.structuredNotes && { structuredNotes: dto.structuredNotes as any }),
        ...(dto.sessionType && { sessionType: dto.sessionType }),
        ...(dto.location && { location: dto.location }),
      },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: { goal: { select: { id: true, goalText: true, domain: true } } },
        },
      },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'SESSION_UPDATED',
        entityType: 'CaseSession',
        entityId: sessionId,
        changes: { fields: Object.keys(dto) },
      },
    });

    return updated;
  }

  /**
   * Sign a session note, locking it from further edits.
   */
  async signSession(caseId: string, sessionId: string, userId: string) {
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.noteStatus === 'SIGNED') {
      throw new BadRequestException('Session note is already signed');
    }

    const signed = await this.prisma.caseSession.update({
      where: { id: sessionId },
      data: {
        noteStatus: 'SIGNED',
        signedAt: new Date(),
      },
      include: {
        therapist: { select: { id: true, name: true, image: true } },
        goalProgress: {
          include: { goal: { select: { id: true, goalText: true, domain: true } } },
        },
      },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'SESSION_SIGNED',
        entityType: 'CaseSession',
        entityId: sessionId,
      },
    });

    return signed;
  }

  /**
   * Log goal progress for a session.
   */
  async logGoalProgress(caseId: string, sessionId: string, userId: string, dto: LogGoalProgressDto) {
    // Verify session belongs to case
    const session = await this.prisma.caseSession.findFirst({
      where: { id: sessionId, caseId },
    });
    if (!session) throw new NotFoundException('Session not found');

    // Verify goal exists and belongs to an IEP on this case
    const goal = await this.prisma.iEPGoal.findFirst({
      where: {
        id: dto.goalId,
        iep: { caseId },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found for this case');

    // Upsert progress record
    const progress = await this.prisma.sessionGoalProgress.upsert({
      where: {
        sessionId_goalId: { sessionId, goalId: dto.goalId },
      },
      create: {
        sessionId,
        goalId: dto.goalId,
        progressNote: dto.progressNote,
        progressValue: dto.progressValue,
      },
      update: {
        progressNote: dto.progressNote,
        progressValue: dto.progressValue,
      },
      include: {
        goal: { select: { id: true, goalText: true, domain: true } },
      },
    });

    // Update the goal's current progress if value provided
    if (dto.progressValue !== undefined) {
      await this.prisma.iEPGoal.update({
        where: { id: dto.goalId },
        data: {
          currentProgress: dto.progressValue,
          ...(dto.progressValue >= 100 && { status: 'ACHIEVED' }),
          ...(dto.progressValue > 0 && dto.progressValue < 100 && { status: 'IN_PROGRESS' }),
        },
      });
    }

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'GOAL_PROGRESS_LOGGED',
        entityType: 'SessionGoalProgress',
        entityId: progress.id,
        changes: { goalId: dto.goalId, progressValue: dto.progressValue },
      },
    });

    return progress;
  }

  /**
   * Bulk log goal progress for multiple goals in one session.
   */
  async bulkLogGoalProgress(
    caseId: string,
    sessionId: string,
    userId: string,
    dto: BulkLogGoalProgressDto,
  ) {
    const results: any[] = [];
    for (const entry of dto.entries) {
      const result = await this.logGoalProgress(caseId, sessionId, userId, entry);
      results.push(result);
    }
    return results;
  }

  /**
   * Save the AI-generated summary on a session.
   */
  async saveAiSummary(sessionId: string, aiSummary: string) {
    return this.prisma.caseSession.update({
      where: { id: sessionId },
      data: { aiSummary },
    });
  }
}
