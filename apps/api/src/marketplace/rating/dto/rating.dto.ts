import { IsInt, IsString, IsBoolean, IsOptional, IsObject, Min, Max, IsEnum } from 'class-validator';

export class CreateRatingDto {
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @IsOptional()
    reviewText?: string;

    @IsObject()
    @IsOptional()
    categories?: {
        professionalism?: number;
        communication?: number;
        helpfulness?: number;
        engagement?: number;
        punctuality?: number;
    };

    @IsBoolean()
    @IsOptional()
    wouldRecommend?: boolean;

    @IsBoolean()
    @IsOptional()
    isAnonymous?: boolean;
}

export class RatingResponseDto {
    id: string;
    rating: number;
    reviewText?: string;
    raterName: string;
    raterType: 'PATIENT' | 'THERAPIST';
    categories?: Record<string, number>;
    wouldRecommend?: boolean;
    createdAt: string;
}

export class TherapistRatingStatsDto {
    averageRating: number;
    totalRatings: number;
    distribution: {
        '5': number;
        '4': number;
        '3': number;
        '2': number;
        '1': number;
    };
    categories?: {
        professionalism?: number;
        communication?: number;
        helpfulness?: number;
    };
    recommendationRate?: number;
}

export class GetRatingsQueryDto {
    @IsInt()
    @IsOptional()
    @Min(1)
    page?: number = 1;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(50)
    limit?: number = 20;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(5)
    minRating?: number;

    @IsEnum(['recent', 'highest', 'lowest'])
    @IsOptional()
    sort?: 'recent' | 'highest' | 'lowest' = 'recent';
}

export class BookingRatingsResponseDto {
    patientRating?: RatingResponseDto;
    therapistRating?: RatingResponseDto;
}

export class PaginatedRatingsResponseDto {
    ratings: RatingResponseDto[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
