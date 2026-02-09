import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, BillingStatus } from '@prisma/client';
import {
  CreateCaseBillingDto,
  UpdateCaseBillingDto,
  ListBillingQueryDto,
} from './dto/case-billing.dto';

@Injectable()
export class CaseBillingService {
  constructor(private prisma: PrismaService) {}

  async createBillingRecord(caseId: string, userId: string, dto: CreateCaseBillingDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    if (dto.sessionId) {
      const existingBilling = await this.prisma.caseBilling.findUnique({
        where: { sessionId: dto.sessionId },
      });
      if (existingBilling) throw new BadRequestException('Billing record already exists for this session');

      const session = await this.prisma.caseSession.findFirst({
        where: { id: dto.sessionId, caseId },
      });
      if (!session) throw new NotFoundException('Session not found for this case');
    }

    const billing = await this.prisma.caseBilling.create({
      data: {
        caseId,
        sessionId: dto.sessionId,
        serviceCode: dto.serviceCode,
        amount: dto.amount,
      },
      include: {
        session: { select: { id: true, scheduledAt: true, sessionType: true } },
      },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'BILLING_CREATED',
        entityType: 'CaseBilling',
        entityId: billing.id,
        changes: { amount: dto.amount, serviceCode: dto.serviceCode },
      },
    });

    return billing;
  }

  async listBillingRecords(caseId: string, query: ListBillingQueryDto) {
    const limit = parseInt(query.limit || '20', 10);
    const where: Prisma.CaseBillingWhereInput = { caseId };
    if (query.status) where.status = query.status;

    const records = await this.prisma.caseBilling.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        session: { select: { id: true, scheduledAt: true, sessionType: true, actualDuration: true } },
      },
    });

    const hasMore = records.length > limit;
    const items = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Compute summary
    const allRecords = await this.prisma.caseBilling.findMany({
      where: { caseId },
      select: { amount: true, status: true },
    });
    const summary = {
      totalBilled: allRecords.reduce((sum, r) => sum + r.amount, 0),
      totalPaid: allRecords.filter((r) => r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0),
      totalPending: allRecords.filter((r) => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0),
      totalOverdue: allRecords.filter((r) => r.status === 'OVERDUE').reduce((sum, r) => sum + r.amount, 0),
      recordCount: allRecords.length,
    };

    return { items, nextCursor, hasMore, summary };
  }

  async updateBillingRecord(caseId: string, billingId: string, userId: string, dto: UpdateCaseBillingDto) {
    const billing = await this.prisma.caseBilling.findFirst({
      where: { id: billingId, caseId },
    });
    if (!billing) throw new NotFoundException('Billing record not found');

    const updated = await this.prisma.caseBilling.update({
      where: { id: billingId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.serviceCode !== undefined && { serviceCode: dto.serviceCode }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.invoiceUrl !== undefined && { invoiceUrl: dto.invoiceUrl }),
        ...(dto.status === BillingStatus.PAID && { paidAt: new Date() }),
      },
      include: {
        session: { select: { id: true, scheduledAt: true, sessionType: true } },
      },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'BILLING_UPDATED',
        entityType: 'CaseBilling',
        entityId: billingId,
        changes: { fields: Object.keys(dto) },
      },
    });

    return updated;
  }
}
