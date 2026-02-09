import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    CreateRatingDto,
    GetRatingsQueryDto,
    RatingResponseDto,
    BookingRatingsResponseDto,
    TherapistRatingStatsDto,
    PaginatedRatingsResponseDto,
} from './dto/rating.dto';

@Controller('marketplace/ratings')
export class RatingController {
    constructor(private ratingService: RatingService) { }

    /**
     * Submit a rating for a booking
     */
    @Post(':bookingId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async submitRating(
        @Param('bookingId') bookingId: string,
        @Body() dto: CreateRatingDto,
        @Request() req: any,
    ): Promise<RatingResponseDto> {
        return this.ratingService.submitRating(bookingId, req.user.userId, dto);
    }

    /**
     * Get ratings for a specific booking
     */
    @Get('booking/:bookingId')
    @UseGuards(JwtAuthGuard)
    async getBookingRatings(
        @Param('bookingId') bookingId: string,
        @Request() req: any,
    ): Promise<BookingRatingsResponseDto> {
        return this.ratingService.getBookingRatings(bookingId, req.user.userId);
    }

    /**
     * Get all ratings for a therapist (public)
     */
    @Get('therapist/:therapistId')
    async getTherapistRatings(
        @Param('therapistId') therapistId: string,
        @Query() query: GetRatingsQueryDto,
    ): Promise<PaginatedRatingsResponseDto> {
        return this.ratingService.getTherapistRatings(therapistId, query);
    }

    /**
     * Get rating statistics for a therapist (public)
     */
    @Get('therapist/:therapistId/stats')
    async getTherapistRatingStats(
        @Param('therapistId') therapistId: string,
    ): Promise<TherapistRatingStatsDto> {
        return this.ratingService.getTherapistRatingStats(therapistId);
    }
}
