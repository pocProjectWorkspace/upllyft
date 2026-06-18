import { Injectable, NotFoundException } from '@nestjs/common';
import { PreVisitTaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreVisitTaskDto, UpdatePreVisitTaskDto } from './dto/clinic-intake.dto';

@Injectable()
export class PreVisitTaskService {
  constructor(private prisma: PrismaService) {}

  async list(childId: string) {
    return this.prisma.preVisitTask.findMany({
      where: { childId },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async create(childId: string, dto: CreatePreVisitTaskDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');
    return this.prisma.preVisitTask.create({
      data: {
        childId,
        type: dto.type,
        label: dto.label,
        caseId: dto.caseId,
        bookingId: dto.bookingId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async updateStatus(childId: string, taskId: string, dto: UpdatePreVisitTaskDto) {
    const task = await this.prisma.preVisitTask.findFirst({ where: { id: taskId, childId } });
    if (!task) throw new NotFoundException('Pre-visit task not found');
    return this.prisma.preVisitTask.update({
      where: { id: taskId },
      data: {
        status: dto.status,
        completedAt: dto.status === PreVisitTaskStatus.COMPLETE ? new Date() : null,
      },
    });
  }
}
