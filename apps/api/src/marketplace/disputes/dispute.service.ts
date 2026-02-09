import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../payment/payment.service';
import {
    RaiseDisputeDto,
    ResolveDisputeDto,
    DisputeResponseDto,
    RefundType,
} from './dto/dispute.dto';
import { DisputeStatus, BookingStatus, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

@Injectable()
export class DisputeService {
    private readonly logger = new Logger(DisputeService.name);

    constructor(
        private prisma: PrismaService,
        private paymentService: PaymentService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Raise a dispute for a booking
     */
    async raiseDispute(
        bookingId: string,
        userId: string,
        dto: RaiseDisputeDto,
    ): Promise<DisputeResponseDto> {
        // Get booking
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                patientId: true,
                therapistId: true,
                endDateTime: true,
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Verify user is participant
        if (userId !== booking.patientId && userId !== booking.therapistId) {
            throw new ForbiddenException('You can only dispute your own sessions');
        }

        // Verify session is completed
        if (booking.status !== BookingStatus.COMPLETED) {
            throw new BadRequestException('Can only dispute completed sessions');
        }

        // Verify within 7-day window
        if (booking.endDateTime) {
            const sevenDaysAgo = subDays(new Date(), 7);
            if (booking.endDateTime < sevenDaysAgo) {
                throw new BadRequestException('Dispute period has expired (7 days after session)');
            }
        }

        // Check if dispute already exists
        const existingDispute = await this.prisma.sessionDispute.findFirst({
            where: { bookingId },
        });

        if (existingDispute) {
            throw new BadRequestException('Dispute already exists for this booking');
        }

        // Create dispute
        const dispute = await this.prisma.sessionDispute.create({
            data: {
                bookingId,
                raisedBy: userId,
                reason: dto.reason,
                description: dto.description,
                status: DisputeStatus.OPEN,
                evidence: dto.evidence ? (dto.evidence as unknown as Prisma.InputJsonValue) : undefined,
            },
            include: {
                raiser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Emit event for notifications
        this.eventEmitter.emit('dispute.filed', {
            disputeId: dispute.id,
            bookingId,
            raisedBy: userId,
            reason: dto.reason,
        });

        this.logger.log(`Dispute filed: ${dispute.id} for booking ${bookingId}`);

        return this.formatDisputeResponse(dispute);
    }

    /**
     * Get all disputes (admin)
     */
    async getAllDisputes(status?: DisputeStatus): Promise<DisputeResponseDto[]> {
        const disputes = await this.prisma.sessionDispute.findMany({
            where: status ? { status } : undefined,
            include: {
                raiser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resolver: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return disputes.map((d) => this.formatDisputeResponse(d));
    }

    /**
     * Get user's disputes
     */
    async getUserDisputes(userId: string): Promise<DisputeResponseDto[]> {
        const disputes = await this.prisma.sessionDispute.findMany({
            where: { raisedBy: userId },
            include: {
                raiser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resolver: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return disputes.map((d) => this.formatDisputeResponse(d));
    }

    /**
     * Resolve a dispute (admin only)
     */
    async resolveDispute(
        disputeId: string,
        adminUserId: string,
        dto: ResolveDisputeDto,
    ): Promise<DisputeResponseDto> {
        const dispute = await this.prisma.sessionDispute.findUnique({
            where: { id: disputeId },
            include: {
                booking: {
                    select: {
                        id: true,
                        stripePaymentIntentId: true,
                        subtotal: true,
                        patientId: true,
                    },
                },
            },
        });

        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
            throw new BadRequestException('Dispute is already resolved');
        }

        let refundAmount = 0;
        let refundIssued = false;

        // Process refund if applicable
        if (dto.refundType === RefundType.FULL) {
            refundAmount = dispute.booking.subtotal || 0;
        } else if (dto.refundType === RefundType.PARTIAL && dto.refundAmount) {
            refundAmount = dto.refundAmount;
        }

        if (refundAmount > 0 && dispute.booking.stripePaymentIntentId) {
            try {
                await this.paymentService.processRefund(
                    dispute.booking.id,
                    refundAmount,
                    'dispute_resolution',
                );
                refundIssued = true;
                this.logger.log(`Refund processed for dispute ${disputeId}: ${refundAmount}`);
            } catch (error) {
                this.logger.error(`Failed to process refund for dispute ${disputeId}:`, error);
                // Continue with resolution even if refund fails
            }
        }

        // Update dispute
        const resolved = await this.prisma.sessionDispute.update({
            where: { id: disputeId },
            data: {
                status: DisputeStatus.RESOLVED,
                resolution: dto.resolution,
                resolvedBy: adminUserId,
                resolvedAt: new Date(),
                refundAmount,
                refundIssued,
            },
            include: {
                raiser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resolver: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Emit event
        this.eventEmitter.emit('dispute.resolved', {
            disputeId,
            resolution: dto.resolution,
            refundAmount,
            refundIssued,
        });

        this.logger.log(`Dispute resolved: ${disputeId} by admin ${adminUserId}`);

        return this.formatDisputeResponse(resolved);
    }

    /**
     * Format dispute response
     */
    private formatDisputeResponse(dispute: any): DisputeResponseDto {
        return {
            id: dispute.id,
            bookingId: dispute.bookingId,
            raisedBy: dispute.raisedBy,
            raisedByName: dispute.raiser?.name || 'Unknown',
            reason: dispute.reason,
            description: dispute.description,
            status: dispute.status,
            resolvedBy: dispute.resolvedBy || undefined,
            resolution: dispute.resolution || undefined,
            resolvedAt: dispute.resolvedAt ? dispute.resolvedAt.toISOString() : undefined,
            refundAmount: dispute.refundAmount || undefined,
            refundIssued: dispute.refundIssued,
            evidence: dispute.evidence,
            createdAt: dispute.createdAt.toISOString(),
            updatedAt: dispute.updatedAt.toISOString(),
        };
    }
}
