import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AssignWorksheetDto } from './dto/assign-worksheet.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { ListAssignmentsDto } from './dto/list-assignments.dto';
import {
  WorksheetAssignmentStatus,
  Prisma,
  Role,
} from '@prisma/client';

@Injectable()
export class WorksheetAssignmentService {
  private readonly logger = new Logger(WorksheetAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async assign(worksheetId: string, dto: AssignWorksheetDto, assignedById: string) {
    // Verify worksheet exists
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
      select: { id: true, title: true, createdById: true },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    // Verify the parent (assignedTo) exists and is a USER
    const parent = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
      select: { id: true, name: true, role: true },
    });
    if (!parent || parent.role !== Role.USER) {
      throw new BadRequestException('Assigned user must be a parent (USER role)');
    }

    // Verify child exists
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      select: { id: true, firstName: true },
    });
    if (!child) throw new NotFoundException('Child not found');

    const assignment = await this.prisma.worksheetAssignment.create({
      data: {
        worksheetId,
        assignedById,
        assignedToId: dto.assignedToId,
        childId: dto.childId,
        caseId: dto.caseId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes ?? null,
      },
      include: {
        worksheet: { select: { id: true, title: true } },
        assignedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true } },
      },
    });

    // Emit event for notifications
    this.eventEmitter.emit('worksheet.assigned', {
      assignmentId: assignment.id,
      worksheetId,
      worksheetTitle: worksheet.title,
      assignedById,
      assignedToId: dto.assignedToId,
      parentName: parent.name,
      childName: child.firstName,
      dueDate: dto.dueDate,
    });

    this.logger.log(
      `Worksheet "${worksheet.title}" assigned to ${parent.name} for ${child.firstName}`,
    );

    return assignment;
  }

  async getSentAssignments(therapistId: string, dto: ListAssignmentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.WorksheetAssignmentWhereInput = {
      assignedById: therapistId,
    };
    if (dto.status) where.status = dto.status;
    if (dto.childId) where.childId = dto.childId;
    if (dto.caseId) where.caseId = dto.caseId;

    const [assignments, total] = await Promise.all([
      this.prisma.worksheetAssignment.findMany({
        where,
        include: {
          worksheet: {
            select: { id: true, title: true, subType: true, previewUrl: true },
          },
          assignedTo: { select: { id: true, name: true } },
          child: { select: { id: true, firstName: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worksheetAssignment.count({ where }),
    ]);

    return { data: assignments, total, page, limit, hasMore: skip + assignments.length < total };
  }

  async getReceivedAssignments(parentId: string, dto: ListAssignmentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.WorksheetAssignmentWhereInput = {
      assignedToId: parentId,
    };
    if (dto.status) where.status = dto.status;
    if (dto.childId) where.childId = dto.childId;

    const [assignments, total] = await Promise.all([
      this.prisma.worksheetAssignment.findMany({
        where,
        include: {
          worksheet: {
            select: { id: true, title: true, subType: true, pdfUrl: true, previewUrl: true },
          },
          assignedBy: { select: { id: true, name: true } },
          child: { select: { id: true, firstName: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worksheetAssignment.count({ where }),
    ]);

    return { data: assignments, total, page, limit, hasMore: skip + assignments.length < total };
  }

  async getAssignment(assignmentId: string, userId: string) {
    const assignment = await this.prisma.worksheetAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        worksheet: {
          select: {
            id: true,
            title: true,
            subType: true,
            content: true,
            pdfUrl: true,
            previewUrl: true,
            difficulty: true,
            targetDomains: true,
          },
        },
        assignedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true, nickname: true } },
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    // Check access
    if (assignment.assignedToId !== userId && assignment.assignedById !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== Role.ADMIN && user?.role !== Role.MODERATOR) {
        throw new ForbiddenException('You do not have access to this assignment');
      }
    }

    // Mark as viewed if parent is viewing for the first time
    if (
      assignment.assignedToId === userId &&
      assignment.status === WorksheetAssignmentStatus.ASSIGNED
    ) {
      await this.prisma.worksheetAssignment.update({
        where: { id: assignmentId },
        data: {
          status: WorksheetAssignmentStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
    }

    return assignment;
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateAssignmentDto,
    userId: string,
  ) {
    const assignment = await this.prisma.worksheetAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        assignedToId: true,
        assignedById: true,
        worksheetId: true,
        childId: true,
        status: true,
        worksheet: { select: { title: true } },
        child: { select: { firstName: true } },
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.assignedToId !== userId) {
      throw new ForbiddenException('Only the assigned parent can update this assignment');
    }

    const updateData: Prisma.WorksheetAssignmentUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === WorksheetAssignmentStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }
    if (dto.parentNotes !== undefined) {
      updateData.parentNotes = dto.parentNotes;
    }

    const updated = await this.prisma.worksheetAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        worksheet: { select: { id: true, title: true } },
        assignedBy: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true } },
      },
    });

    // Emit completion event
    if (dto.status === WorksheetAssignmentStatus.COMPLETED) {
      this.eventEmitter.emit('worksheet.completed', {
        assignmentId,
        worksheetId: assignment.worksheetId,
        worksheetTitle: assignment.worksheet.title,
        assignedById: assignment.assignedById,
        assignedToId: userId,
        childName: assignment.child.firstName,
      });

      this.logger.log(
        `Assignment ${assignmentId} marked as completed by parent`,
      );
    }

    return updated;
  }
}
