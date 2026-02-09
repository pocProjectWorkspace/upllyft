import { IsNumber, IsBoolean, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';

export class UpdatePlatformSettingsDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    platformCommissionPercentage?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(72)
    escrowHoldHours?: number;

    @IsBoolean()
    @IsOptional()
    enableMarketplace?: boolean;
}

export class PlatformSettingsResponseDto {
    platformCommissionPercentage: number;
    escrowHoldHours: number;
    enableMarketplace: boolean;
    stripePlatformAccountId?: string;
    createdAt: string;
    updatedAt: string;
}

export class AnalyticsQueryDto {
    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;
}

export class PlatformAnalyticsResponseDto {
    revenue: {
        totalGMV: number;
        platformFees: number;
        therapistPayouts: number;
        organizationPayouts: number;
    };
    bookings: {
        total: number;
        completed: number;
        canceled: number;
        disputed: number;
        completionRate: number;
        cancellationRate: number;
    };
    users: {
        activeTherapists: number;
        activePatients: number;
        newTherapists: number;
        newPatients: number;
    };
    growth: {
        momGrowth: number;
        retentionRate: number;
    };
}

export class RevenueBreakdownDto {
    period: {
        startDate: string;
        endDate: string;
    };
    totalRevenue: number;
    platformRevenue: number;
    therapistRevenue: number;
    organizationRevenue: number;
    byOrganization: Array<{
        organizationId: string;
        organizationName: string;
        revenue: number;
        bookings: number;
    }>;
    byTherapist: Array<{
        therapistId: string;
        therapistName: string;
        revenue: number;
        bookings: number;
    }>;
}
