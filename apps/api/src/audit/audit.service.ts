import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        action: params.action,
        metadata: params.metadata ?? undefined,
      },
    });
  }
}
