import { IsString, IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreatePackageDto {
    @IsString()
    organizationId: string;

    @IsString()
    sessionTypeId: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(2)
    @Max(50)
    sessionsCount: number;

    @IsNumber()
    @Min(0)
    regularPrice: number;

    @IsNumber()
    @Min(0)
    packagePrice: number;

    @IsInt()
    @Min(7)
    @Max(365)
    validityDays: number;
}

export class PurchasePackageDto {
    @IsString()
    paymentMethodId: string;
}

export class UsePackageSessionDto {
    @IsString()
    bookingId: string;
}

export class PackageResponseDto {
    id: string;
    name: string;
    description?: string;
    sessionsCount: number;
    regularPrice: number;
    packagePrice: number;
    savings: number;
    validityDays: number;
    isActive: boolean;
    sessionType: {
        id: string;
        name: string;
        duration: number;
    };
}

export class PackagePurchaseResponseDto {
    id: string;
    packageId: string;
    packageName: string;
    sessionsTotal: number;
    sessionsUsed: number;
    sessionsRemaining: number;
    totalPaid: number;
    currency: string;
    purchasedAt: string;
    expiresAt: string;
    isActive: boolean;
}
