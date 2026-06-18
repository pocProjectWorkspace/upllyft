import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PreAuthStatus,
  FinancialClearanceStatus,
  PreVisitTaskType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInsurancePolicyDto,
  UpdateInsurancePolicyDto,
  CreatePreAuthorizationDto,
  DecidePreAuthorizationDto,
  RenewPreAuthorizationDto,
  SetBookingClearanceDto,
} from './dto/payer.dto';

/**
 * Phase 2 (UAE): payer / insurance / pre-authorisation. Workflow-layer payer
 * coordination — coexists with the consumer Stripe self-pay flow; clearance
 * gating applies to clinic care-delivery bookings only.
 */
@Injectable()
export class PayerService {
  constructor(private prisma: PrismaService) {}

  private d(v?: string) {
    return v ? new Date(v) : undefined;
  }

  // ── Insurance policies ──
  async listPolicies(childId: string) {
    return this.prisma.insurancePolicy.findMany({
      where: { childId },
      include: { preAuthorizations: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPolicy(childId: string, dto: CreateInsurancePolicyDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');
    return this.prisma.insurancePolicy.create({
      data: {
        childId,
        payerType: dto.payerType,
        insurerName: dto.insurerName,
        sponsorName: dto.sponsorName,
        policyNumber: dto.policyNumber,
        memberId: dto.memberId,
        cardDocumentUrl: dto.cardDocumentUrl,
        validFrom: this.d(dto.validFrom),
        validUntil: this.d(dto.validUntil),
        coPayPercent: dto.coPayPercent,
      },
    });
  }

  async updatePolicy(childId: string, policyId: string, dto: UpdateInsurancePolicyDto) {
    const policy = await this.prisma.insurancePolicy.findFirst({ where: { id: policyId, childId } });
    if (!policy) throw new NotFoundException('Insurance policy not found');
    return this.prisma.insurancePolicy.update({
      where: { id: policyId },
      data: {
        payerType: dto.payerType,
        insurerName: dto.insurerName,
        sponsorName: dto.sponsorName,
        policyNumber: dto.policyNumber,
        memberId: dto.memberId,
        cardDocumentUrl: dto.cardDocumentUrl,
        validFrom: this.d(dto.validFrom),
        validUntil: this.d(dto.validUntil),
        coPayPercent: dto.coPayPercent,
        isActive: dto.isActive,
      },
    });
  }

  // ── Pre-authorisations ──
  async listPreAuths(caseId?: string) {
    return this.prisma.preAuthorization.findMany({
      where: caseId ? { caseId } : {},
      include: { policy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPreAuth(dto: CreatePreAuthorizationDto) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: dto.policyId } });
    if (!policy) throw new NotFoundException('Insurance policy not found');
    return this.prisma.preAuthorization.create({
      data: {
        policyId: dto.policyId,
        caseId: dto.caseId,
        serviceCode: dto.serviceCode,
        preAuthNumber: dto.preAuthNumber,
        approvedSessions: dto.approvedSessions,
        validFrom: this.d(dto.validFrom),
        validUntil: this.d(dto.validUntil),
      },
    });
  }

  async decidePreAuth(id: string, dto: DecidePreAuthorizationDto) {
    const preAuth = await this.prisma.preAuthorization.findUnique({ where: { id } });
    if (!preAuth) throw new NotFoundException('Pre-authorisation not found');

    const updated = await this.prisma.preAuthorization.update({
      where: { id },
      data: {
        status: dto.status,
        preAuthNumber: dto.preAuthNumber ?? preAuth.preAuthNumber,
        approvedSessions: dto.approvedSessions ?? preAuth.approvedSessions,
        validUntil: this.d(dto.validUntil) ?? preAuth.validUntil,
        denialReason: dto.status === PreAuthStatus.DENIED ? dto.denialReason : null,
      },
    });

    // Payer-denial fallback: raise a self-pay pre-visit task for the family.
    if (dto.status === PreAuthStatus.DENIED && preAuth.caseId) {
      const c = await this.prisma.case.findUnique({
        where: { id: preAuth.caseId },
        select: { childId: true },
      });
      if (c) {
        await this.prisma.preVisitTask.create({
          data: {
            childId: c.childId,
            caseId: preAuth.caseId,
            type: PreVisitTaskType.PAYMENT,
            label: 'Pre-authorisation denied — arrange self-pay or alternative payer',
          },
        });
      }
    }

    return updated;
  }

  /** Renew: create a new pre-auth linked to the old, mark the old EXPIRED. */
  async renewPreAuth(id: string, dto: RenewPreAuthorizationDto) {
    const prev = await this.prisma.preAuthorization.findUnique({ where: { id } });
    if (!prev) throw new NotFoundException('Pre-authorisation not found');

    const renewal = await this.prisma.preAuthorization.create({
      data: {
        policyId: prev.policyId,
        caseId: prev.caseId,
        serviceCode: prev.serviceCode,
        preAuthNumber: dto.preAuthNumber ?? prev.preAuthNumber,
        status: PreAuthStatus.PENDING,
        approvedSessions: dto.approvedSessions,
        validFrom: this.d(dto.validFrom),
        validUntil: this.d(dto.validUntil),
        renewedFromId: prev.id,
      },
    });
    await this.prisma.preAuthorization.update({
      where: { id },
      data: { status: PreAuthStatus.EXPIRED },
    });
    return renewal;
  }

  // ── Financial clearance (clinic bookings) ──
  async setBookingClearance(bookingId: string, userId: string, dto: SetBookingClearanceDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        financialClearance: dto.status,
        clearanceApprovedById:
          dto.status === FinancialClearanceStatus.EXCEPTION_APPROVED ? userId : booking.clearanceApprovedById,
      },
    });
  }

  /**
   * Pre-visit readiness — what is blocking encounter start for a booking.
   * Aggregates payment, financial clearance, pre-auth, consent and credential.
   */
  async getBookingReadiness(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { caseSession: { select: { caseId: true } }, therapist: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const blockers: string[] = [];
    if (booking.paymentStatus !== 'PAID' && booking.paymentRoute === 'SELF_PAY') {
      blockers.push('Payment outstanding (self-pay)');
    }
    if (
      booking.clinicId &&
      [FinancialClearanceStatus.PENDING, FinancialClearanceStatus.BLOCKED].includes(
        booking.financialClearance,
      )
    ) {
      blockers.push(`Financial clearance: ${booking.financialClearance}`);
    }
    if (booking.therapist?.credentialStatus !== 'VERIFIED') {
      blockers.push('Therapist licence not verified');
    }

    const caseId = booking.caseSession?.caseId;
    if (caseId) {
      const activePreAuth = await this.prisma.preAuthorization.findFirst({
        where: { caseId, status: PreAuthStatus.APPROVED },
      });
      if (booking.paymentRoute !== 'SELF_PAY' && !activePreAuth) {
        blockers.push('No approved pre-authorisation on case');
      }
      if (activePreAuth?.approvedSessions != null && activePreAuth.usedSessions >= activePreAuth.approvedSessions) {
        blockers.push('Pre-authorised sessions exhausted');
      }
    }

    return {
      bookingId,
      ready: blockers.length === 0,
      financialClearance: booking.financialClearance,
      paymentRoute: booking.paymentRoute,
      paymentStatus: booking.paymentStatus,
      blockers,
    };
  }

  /**
   * Clearance gate for clinic encounter start (called from clinic check-in).
   * Clinic bookings only — consumer/marketplace bookings are unaffected.
   */
  async assertEncounterFinancialClearance(booking: {
    clinicId: string | null;
    financialClearance: FinancialClearanceStatus;
  }) {
    if (!booking.clinicId) return; // not a clinic booking
    const blocked = [FinancialClearanceStatus.PENDING, FinancialClearanceStatus.BLOCKED].includes(
      booking.financialClearance,
    );
    if (blocked) {
      throw new ForbiddenException(
        `Encounter cannot start: financial clearance is ${booking.financialClearance}. Clear payment/pre-authorisation or record an approved exception.`,
      );
    }
  }
}
