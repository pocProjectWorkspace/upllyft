import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    CreateRatingDto,
    RatingResponseDto,
    TherapistRatingStatsDto,
    GetRatingsQueryDto,
    BookingRatingsResponseDto,
    PaginatedRatingsResponseDto,
} from './dto/rating.dto';
import { BookingStatus, RaterType, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

@Injectable()
export class RatingService {
    private readonly logger = new Logger(RatingService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Submit a rating for a booking
     */
    async submitRating(
        bookingId: string,
        userId: string,
        dto: CreateRatingDto,
    ): Promise<RatingResponseDto> {
        // Get booking with participants
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                patient: { select: { id: true, name: true, email: true } },
                therapist: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Validate booking is completed
        if (booking.status !== BookingStatus.COMPLETED) {
            throw new BadRequestException('Can only rate completed sessions');
        }

        // Check if session was completed within last 30 days
        const thirtyDaysAgo = subDays(new Date(), 30);
        if (booking.endDateTime && booking.endDateTime < thirtyDaysAgo) {
            throw new BadRequestException('Rating period has expired (30 days after session)');
        }

        // Determine rater type
        let raterType: RaterType;
        let therapistId: string;

        if (userId === booking.patientId) {
            raterType = RaterType.PATIENT;
            therapistId = booking.therapistId;
        } else if (userId === booking.therapistId) {
            raterType = RaterType.THERAPIST;
            therapistId = booking.therapistId;
        } else {
            throw new ForbiddenException('You can only rate sessions you participated in');
        }

        // Check if rating already exists
        const existingRating = await this.prisma.sessionRating.findUnique({
            where: {
                bookingId_ratedBy: {
                    bookingId,
                    ratedBy: userId,
                },
            },
        });

        if (existingRating) {
            throw new BadRequestException('You have already rated this session');
        }

        // Create rating
        const rating = await this.prisma.sessionRating.create({
            data: {
                bookingId,
                ratedBy: userId,
                raterType,
                therapistId,
                rating: dto.rating,
                review: dto.reviewText,
                professionalismRating: dto.categories?.professionalism,
                communicationRating: dto.categories?.communication,
                helpfulnessRating: dto.categories?.helpfulness,
            },
            include: {
                rater: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Update therapist rating stats if this  is a patient rating
        if (raterType === RaterType.PATIENT) {
            await this.updateTherapistRatingStats(therapistId);
        }

        // Emit event for notifications
        this.eventEmitter.emit('rating.submitted', {
            bookingId,
            therapistId,
            patientId: booking.patientId,
            rating: dto.rating,
            raterType,
            reviewText: dto.reviewText,
        });

        this.logger.log(`Rating ${rating.id} submitted for booking ${bookingId} by ${raterType}`);

        return this.formatRatingResponse(rating);
    }

    /**
     * Get ratings for a specific booking
     */
    async getBookingRatings(bookingId: string, userId: string): Promise<BookingRatingsResponseDto> {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                patientId: true,
                therapistId: true,
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Only participants can view ratings
        if (userId !== booking.patientId && userId !== booking.therapistId) {
            throw new ForbiddenException('You can only view ratings for your own sessions');
        }

        const ratings = await this.prisma.sessionRating.findMany({
            where: { bookingId },
            include: {
                rater: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const patientRating = ratings.find((r) => r.raterType === RaterType.PATIENT);
        const therapistRating = ratings.find((r) => r.raterType === RaterType.THERAPIST);

        return {
            patientRating: patientRating ? this.formatRatingResponse(patientRating) : undefined,
            therapistRating: therapistRating ? this.formatRatingResponse(therapistRating) : undefined,
        };
    }

    /**
     * Get all ratings for a therapist (public)
     */
    async getTherapistRatings(
        therapistId: string,
        query: GetRatingsQueryDto,
    ): Promise<PaginatedRatingsResponseDto> {
        const { page = 1, limit = 20, minRating, sort = 'recent' } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.SessionRatingWhereInput = {
            therapistId,
            raterType: RaterType.PATIENT, // Only show patient ratings publicly
        };

        if (minRating) {
            where.rating = { gte: minRating };
        }

        // Build order by
        let orderBy: Prisma.SessionRatingOrderByWithRelationInput;
        switch (sort) {
            case 'highest':
                orderBy = { rating: 'desc' };
                break;
            case 'lowest':
                orderBy = { rating: 'asc' };
                break;
            case 'recent':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        // Get ratings and total count
        const [ratings, total] = await Promise.all([
            this.prisma.sessionRating.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    rater: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.sessionRating.count({ where }),
        ]);

        return {
            ratings: ratings.map((r) => this.formatRatingResponse(r)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get therapist rating statistics
     */
    async getTherapistRatingStats(therapistId: string): Promise<TherapistRatingStatsDto> {
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { userId: therapistId },
            select: {
                overallRating: true,
                totalRatings: true,
            },
        });

        if (!therapist) {
            throw new NotFoundException('Therapist not found');
        }

        // Get all patient ratings for detailed stats
        const ratings = await this.prisma.sessionRating.findMany({
            where: {
                therapistId,
                raterType: RaterType.PATIENT,
            },
            select: {
                rating: true,
                professionalismRating: true,
                communicationRating: true,
                helpfulnessRating: true,
            },
        });

        // Calculate distribution
        const distribution = {
            '5': ratings.filter((r) => r.rating === 5).length,
            '4': ratings.filter((r) => r.rating === 4).length,
            '3': ratings.filter((r) => r.rating === 3).length,
            '2': ratings.filter((r) => r.rating === 2).length,
            '1': ratings.filter((r) => r.rating === 1).length,
        };

        // Calculate category averages
        const categories = this.calculateCategoryAverages(ratings);

        return {
            averageRating: therapist.overallRating || 0,
            totalRatings: therapist.totalRatings || 0,
            distribution,
            categories,
        };
    }

    /**
     * Update cached rating stats on therapist profile
     */
    private async updateTherapistRatingStats(therapistId: string): Promise<void> {
        // Get all patient ratings for this therapist
        const ratings = await this.prisma.sessionRating.findMany({
            where: {
                therapistId,
                raterType: RaterType.PATIENT,
            },
            select: {
                rating: true,
            },
        });

        if (ratings.length === 0) {
            return;
        }

        // Calculate average
        const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / ratings.length;

        // Update therapist profile
        await this.prisma.therapistProfile.update({
            where: { userId: therapistId },
            data: {
                overallRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
                totalRatings: ratings.length,
            },
        });

        this.logger.log(`Updated rating stats for therapist ${therapistId}: ${averageRating.toFixed(1)} (${ratings.length} ratings)`);
    }

    /**
     * Calculate category averages
     */
    private calculateCategoryAverages(
        ratings: Array<{
            professionalismRating: number | null;
            communicationRating: number | null;
            helpfulnessRating: number | null;
        }>,
    ): Record<string, number> {
        const categories: Record<string, number> = {};

        // Professionalism
        const profRatings = ratings.filter((r) => r.professionalismRating !== null).map((r) => r.professionalismRating!);
        if (profRatings.length > 0) {
            categories.professionalism = Math.round((profRatings.reduce((a, b) => a + b, 0) / profRatings.length) * 10) / 10;
        }

        // Communication
        const commRatings = ratings.filter((r) => r.communicationRating !== null).map((r) => r.communicationRating!);
        if (commRatings.length > 0) {
            categories.communication = Math.round((commRatings.reduce((a, b) => a + b, 0) / commRatings.length) * 10) / 10;
        }

        // Helpfulness
        const helpRatings = ratings.filter((r) => r.helpfulnessRating !== null).map((r) => r.helpfulnessRating!);
        if (helpRatings.length > 0) {
            categories.helpfulness = Math.round((helpRatings.reduce((a, b) => a + b, 0) / helpRatings.length) * 10) / 10;
        }

        return categories;
    }

    /**
     * Format rating response with anonymization
     */
    private formatRatingResponse(rating: any): RatingResponseDto {
        let raterName = 'Anonymous';

        if (rating.rater?.name) {
            // Format: "FirstName L."
            const nameParts = rating.rater.name.split(' ');
            if (nameParts.length > 1) {
                raterName = `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`;
            } else {
                raterName = nameParts[0];
            }
        }

        const categories: Record<string, number> = {};
        if (rating.professionalismRating) categories.professionalism = rating.professionalismRating;
        if (rating.communicationRating) categories.communication = rating.communicationRating;
        if (rating.helpfulnessRating) categories.helpfulness = rating.helpfulnessRating;

        return {
            id: rating.id,
            rating: rating.rating,
            reviewText: rating.review || undefined,
            raterName,
            raterType: rating.raterType,
            categories: Object.keys(categories).length > 0 ? categories : undefined,
            createdAt: rating.createdAt.toISOString(),
        };
    }
}
