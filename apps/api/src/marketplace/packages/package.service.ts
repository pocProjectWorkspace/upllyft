import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../payment/payment.service';
import {
    CreatePackageDto,
    PurchasePackageDto,
    UsePackageSessionDto,
    PackageResponseDto,
    PackagePurchaseResponseDto,
} from './dto/package.dto';
import { PaymentStatus } from '@prisma/client';
import { addDays } from 'date-fns';

@Injectable()
export class PackageService {
    private readonly logger = new Logger(PackageService.name);

    constructor(
        private prisma: PrismaService,
        private paymentService: PaymentService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create a session package (organization)
     */
    async createPackage(dto: CreatePackageDto): Promise<PackageResponseDto> {
        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: dto.organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // Verify session type exists
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: dto.sessionTypeId },
        });

        if (!sessionType) {
            throw new NotFoundException('Session type not found');
        }

        // Validate pricing
        if (dto.packagePrice >= dto.regularPrice) {
            throw new BadRequestException('Package price must be less than regular price');
        }

        const savings = dto.regularPrice - dto.packagePrice;

        // Create package
        const packageData = await this.prisma.bookingPackage.create({
            data: {
                organizationId: dto.organizationId,
                name: dto.name,
                description: dto.description,
                sessionTypeId: dto.sessionTypeId,
                numberOfSessions: dto.sessionsCount,
                sessionsCount: dto.sessionsCount,
                regularPrice: dto.regularPrice,
                packagePrice: dto.packagePrice,
                totalPrice: dto.packagePrice, // Total is the discounted package price
                pricePerSession: dto.packagePrice / dto.sessionsCount,
                savings,
                validityDays: dto.validityDays,
                isActive: true,
            },
            include: {
                sessionType: {
                    select: {
                        id: true,
                        name: true,
                        duration: true,
                    },
                },
            },
        });

        this.logger.log(`Package created: ${packageData.id} - ${packageData.name}`);

        return this.formatPackageResponse(packageData);
    }

    /**
     * Get packages for an organization
     */
    async getOrganizationPackages(organizationId: string, includeInactive = false): Promise<PackageResponseDto[]> {
        const packages = await this.prisma.bookingPackage.findMany({
            where: {
                organizationId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            include: {
                sessionType: {
                    select: {
                        id: true,
                        name: true,
                        duration: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return packages.map((p) => this.formatPackageResponse(p));
    }

    /**
     * Purchase a package (patient)
     */
    async purchasePackage(
        packageId: string,
        patientId: string,
        dto: PurchasePackageDto,
    ): Promise<PackagePurchaseResponseDto> {
        // Get package
        const packageData = await this.prisma.bookingPackage.findUnique({
            where: { id: packageId },
            include: {
                sessionType: true,
            },
        });

        if (!packageData) {
            throw new NotFoundException('Package not found');
        }

        if (!packageData.isActive) {
            throw new BadRequestException('Package is no longer available');
        }

        // Check if patient already has an active package for this session type
        const existingPurchase = await this.prisma.packagePurchase.findFirst({
            where: {
                patientId,
                package: {
                    sessionTypeId: packageData.sessionTypeId,
                },
                isActive: true,
                expiresAt: {
                    gte: new Date(),
                },
            },
        });

        if (existingPurchase) {
            throw new BadRequestException('You already have an active package for this session type');
        }

        // Create payment intent for package purchase
        // Note: For packages, we create a direct payment without connect transfer
        // This should be updated to use proper payment flow later
        const paymentIntent = await this.paymentService['stripeConnect']['stripe'].paymentIntents.create({
            amount: Math.round(packageData.packagePrice * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                type: 'package_purchase',
                packageId,
                patientId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Create package purchase
        const expiresAt = addDays(new Date(), packageData.validityDays);

        const purchase = await this.prisma.packagePurchase.create({
            data: {
                patientId,
                packageId,
                sessionsTotal: packageData.sessionsCount,
                sessionsUsed: 0,
                sessionsRemaining: packageData.sessionsCount,
                totalPaid: packageData.packagePrice,
                currency: 'USD',
                stripePaymentIntentId: paymentIntent.id,
                paymentStatus: PaymentStatus.PENDING,
                purchasedAt: new Date(),
                expiresAt,
                isActive: false, // Will be activated when payment succeeds
            },
            include: {
                package: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        this.logger.log(`Package purchase created: ${purchase.id} for patient ${patientId}`);

        return this.formatPurchaseResponse(purchase);
    }

    /**
     * Use a package session (deduct from balance)
     */
    async usePackageSession(
        purchaseId: string,
        dto: UsePackageSessionDto,
        userId: string,
    ): Promise<PackagePurchaseResponseDto> {
        // Get purchase
        const purchase = await this.prisma.packagePurchase.findUnique({
            where: { id: purchaseId },
            include: {
                package: {
                    select: {
                        name: true,
                        sessionTypeId: true,
                    },
                },
            },
        });

        if (!purchase) {
            throw new NotFoundException('Package purchase not found');
        }

        // Verify user owns this purchase
        if (purchase.patientId !== userId) {
            throw new ForbiddenException('Not authorized to use this package');
        }

        // Verify package is active and not expired
        if (!purchase.isActive) {
            throw new BadRequestException('Package is not active');
        }

        if (purchase.expiresAt < new Date()) {
            throw new BadRequestException('Package has expired');
        }

        // Verify sessions remaining
        if (purchase.sessionsRemaining <= 0) {
            throw new BadRequestException('No sessions remaining in package');
        }

        // Verify booking exists and is for correct session type
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.sessionTypeId !== purchase.package.sessionTypeId) {
            throw new BadRequestException('Booking session type does not match package');
        }

        // Update purchase - deduct session
        const updated = await this.prisma.packagePurchase.update({
            where: { id: purchaseId },
            data: {
                sessionsUsed: { increment: 1 },
                sessionsRemaining: { decrement: 1 },
            },
            include: {
                package: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        this.logger.log(`Package session used: ${purchaseId}, ${updated.sessionsRemaining} remaining`);

        // Emit event
        this.eventEmitter.emit('package.session.used', {
            purchaseId,
            bookingId: dto.bookingId,
            sessionsRemaining: updated.sessionsRemaining,
        });

        return this.formatPurchaseResponse(updated);
    }

    /**
     * Get patient's package purchases
     */
    async getPatientPackages(patientId: string, activeOnly = true): Promise<PackagePurchaseResponseDto[]> {
        const purchases = await this.prisma.packagePurchase.findMany({
            where: {
                patientId,
                ...(activeOnly ? { isActive: true, expiresAt: { gte: new Date() } } : {}),
            },
            include: {
                package: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { purchasedAt: 'desc' },
        });

        return purchases.map((p) => this.formatPurchaseResponse(p));
    }

    /**
     * Format package response
     */
    private formatPackageResponse(pkg: any): PackageResponseDto {
        return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description || undefined,
            sessionsCount: pkg.sessionsCount,
            regularPrice: pkg.regularPrice,
            packagePrice: pkg.packagePrice,
            savings: pkg.savings,
            validityDays: pkg.validityDays,
            isActive: pkg.isActive,
            sessionType: {
                id: pkg.sessionType.id,
                name: pkg.sessionType.name,
                duration: pkg.sessionType.duration,
            },
        };
    }

    /**
     * Format purchase response
     */
    private formatPurchaseResponse(purchase: any): PackagePurchaseResponseDto {
        return {
            id: purchase.id,
            packageId: purchase.packageId,
            packageName: purchase.package.name,
            sessionsTotal: purchase.sessionsTotal,
            sessionsUsed: purchase.sessionsUsed,
            sessionsRemaining: purchase.sessionsRemaining,
            totalPaid: purchase.totalPaid,
            currency: purchase.currency,
            purchasedAt: purchase.purchasedAt.toISOString(),
            expiresAt: purchase.expiresAt.toISOString(),
            isActive: purchase.isActive,
        };
    }
}
