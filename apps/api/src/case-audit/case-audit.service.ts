import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CaseAuditService {
  constructor(private prisma: PrismaService) {}

  async getAuditLog(
    caseId: string,
    cursor?: string,
    limit = 50,
    entityType?: string,
    action?: string,
  ) {
    const where: Prisma.CaseAuditLogWhereInput = { caseId };
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };

    const logs = await this.prisma.caseAuditLog.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  async getAuditSummary(caseId: string) {
    const [totalEntries, actionCounts, recentActivity] = await Promise.all([
      this.prisma.caseAuditLog.count({ where: { caseId } }),
      this.prisma.caseAuditLog.groupBy({
        by: ['action'],
        where: { caseId },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.caseAuditLog.findMany({
        where: { caseId },
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      totalEntries,
      actionBreakdown: actionCounts.map((ac) => ({
        action: ac.action,
        count: ac._count.action,
      })),
      recentActivity,
    };
  }
}
