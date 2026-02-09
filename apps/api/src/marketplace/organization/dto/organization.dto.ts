import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsDateString,
    Min,
    Max,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TherapistApprovalStatus } from '@prisma/client';

// ==================== Therapist Management DTOs ====================

export class LinkTherapistDto {
    @IsString()
    therapistId: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    therapistRevenuePercentage?: number; // Default: organization settings

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateTherapistLinkDto {
    @IsOptional()
    @IsEnum(TherapistApprovalStatus)
    approvalStatus?: TherapistApprovalStatus;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    therapistRevenuePercentage?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    notes?: string;
}

// ==================== Session Type DTOs ====================

export class CreateSessionTypeDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(15)
    duration: number; // in minutes

    @IsOptional()
    @IsNumber()
    @Min(0)
    bufferTime?: number; // in minutes

    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @IsString()
    currency?: string; // Default: USD

    @IsOptional()
    @IsBoolean()
    requiresPreSessionQuestionnaire?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateSessionTypeDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(15)
    duration?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bufferTime?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    requiresPreSessionQuestionnaire?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ==================== Availability Template DTOs ====================

class TemplateSlotDto {
    @IsNumber()
    @Min(0)
    @Max(6)
    dayOfWeek: number; // 0=Sunday, 6=Saturday

    @IsString()
    startTime: string; // HH:mm format

    @IsString()
    endTime: string; // HH:mm format
}

export class CreateAvailabilityTemplateDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    timezone: string; // e.g., "America/New_York"

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateSlotDto)
    slots: TemplateSlotDto[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    defaultBufferTime?: number; // in minutes
}

export class ApplyTemplateDto {
    @IsString()
    therapistId: string;

    @IsOptional()
    @IsBoolean()
    overwriteExisting?: boolean; // Default: false (merge with existing)
}

// ==================== Revenue Configuration DTOs ====================

export class UpdateRevenueSplitDto {
    @IsNumber()
    @Min(0)
    @Max(100)
    defaultTherapistPercentage: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    defaultOrganizationPercentage?: number; // Auto-calculated if not provided
}

// ==================== Analytics DTOs ====================

export class AnalyticsQueryDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    therapistId?: string; // Filter by specific therapist

    @IsOptional()
    @IsString()
    sessionTypeId?: string; // Filter by session type
}

export class RevenueAnalyticsResponseDto {
    totalRevenue: number;
    platformRevenue: number;
    organizationRevenue: number;
    therapistRevenue: number;
    totalBookings: number;
    completedSessions: number;
    canceledSessions: number;
    averageSessionPrice: number;
    currency: string;
    period: {
        startDate: string;
        endDate: string;
    };
}

export class BookingStatisticsResponseDto {
    totalBookings: number;
    byStatus: {
        pending: number;
        confirmed: number;
        completed: number;
        canceled: number;
        rejected: number;
    };
    bySessionType: Array<{
        sessionTypeId: string;
        sessionTypeName: string;
        count: number;
        revenue: number;
    }>;
    period: {
        startDate: string;
        endDate: string;
    };
}

export class TherapistPerformanceDto {
    therapistId: string;
    therapistName: string;
    totalSessions: number;
    completedSessions: number;
    canceledSessions: number;
    totalRevenue: number;
    averageRating: number | null;
    totalRatings: number;
    acceptanceRate: number; // Percentage of bookings accepted
    completionRate: number; // Percentage of completed vs confirmed bookings
}
