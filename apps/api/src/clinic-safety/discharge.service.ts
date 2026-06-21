import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DischargeCaseDto } from './dto/safety.dto';

// UAE medical-record retention default (~7 years) when none specified.
const DEFAULT_RETENTION_DAYS = 2555;

/**
 * Phase 4 (UAE): discharge, financial closure, soft retention/archive, and
 * reactivation. Closure cancels future appointments and reports open billing;
 * the EHR remains the legal record, so Upllyft only soft-archives.
 */
@Injectable()
export class DischargeService {
  constructor(private prisma: PrismaService) {}

  async discharge(caseId: string, userId: string, dto: DischargeCaseDto) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!c) throw new NotFoundException('Case not found');

    const now = new Date();

    // Future-appointment check: cancel upcoming case-linked bookings.
    const futureSessions = await this.prisma.caseSession.findMany({
      where: { caseId, scheduledAt: { gt: now }, bookingId: { not: null } },
      select: { bookingId: true },
    });
    const bookingIds = futureSessions.map((s) => s.bookingId!).filter(Boolean);
    let cancelledBookings = 0;
    if (bookingIds.length) {
      const res = await this.prisma.booking.updateMany({
        where: { id: { in: bookingIds }, status: { notIn: [BookingStatus.COMPLETED, BookingStatus.CANCELLED_BY_PATIENT, BookingStatus.CANCELLED_BY_THERAPIST] } },
        data: {
          status: BookingStatus.CANCELLED_BY_THERAPIST,
          cancelledAt: now,
          cancellationReason: 'Case discharged',
        },
      });
      cancelledBookings = res.count;
    }

    // Financial closure: surface (do not auto-mutate) open billing.
    const openBilling = await this.prisma.caseBilling.count({
      where: { caseId, status: { in: ['PENDING', 'BILLED', 'OVERDUE'] } },
    });

    const retentionUntil = new Date(now);
    retentionUntil.setDate(retentionUntil.getDate() + (dto.retentionDays ?? DEFAULT_RETENTION_DAYS));

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.DISCHARGED,
        dischargedAt: now,
        clinicalDischargeReason: dto.clinicalReason,
        adminDischargeReason: dto.adminReason,
        dischargeReason: [dto.clinicalReason, dto.adminReason].filter(Boolean).join(' | ') || undefined,
        dischargeSummaryDocId: dto.dischargeSummaryDocId,
        retentionUntil,
      },
    });

    return { case: updated, cancelledBookings, openBilling };
  }

  /** Soft archive — Upllyft is not the legal record, so no destructive delete. */
  async archive(caseId: string) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!c) throw new NotFoundException('Case not found');
    return this.prisma.case.update({
      where: { id: caseId },
      data: { status: CaseStatus.ARCHIVED, archivedAt: new Date() },
    });
  }

  /** Reactivate a discharged/archived case without duplicate registration. */
  async reactivate(caseId: string) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!c) throw new NotFoundException('Case not found');
    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.ACTIVE,
        reactivatedAt: new Date(),
        dischargedAt: null,
        archivedAt: null,
      },
    });
  }
}
