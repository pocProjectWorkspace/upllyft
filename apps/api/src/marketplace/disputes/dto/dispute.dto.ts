import { IsString, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DisputeReason {
    NO_SHOW = 'NO_SHOW',
    POOR_QUALITY = 'POOR_QUALITY',
    TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
    BILLING_ISSUE = 'BILLING_ISSUE',
    OTHER = 'OTHER',
}

export enum RefundType {
    FULL = 'FULL',
    PARTIAL = 'PARTIAL',
    NONE = 'NONE',
}

export class EvidenceDto {
    @IsEnum(['text', 'image', 'video'])
    type: 'text' | 'image' | 'video';

    @IsString()
    @IsOptional()
    url?: string;

    @IsString()
    description: string;
}

export class RaiseDisputeDto {
    @IsEnum(DisputeReason)
    reason: DisputeReason;

    @IsString()
    description: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvidenceDto)
    @IsOptional()
    evidence?: EvidenceDto[];
}

export class ResolveDisputeDto {
    @IsString()
    resolution: string;

    @IsEnum(RefundType)
    refundType: RefundType;

    @IsNumber()
    @Min(0)
    @IsOptional()
    refundAmount?: number;
}

export class DisputeResponseDto {
    id: string;
    bookingId: string;
    raisedBy: string;
    raisedByName: string;
    reason: string;
    description: string;
    status: string;
    resolvedBy?: string;
    resolution?: string;
    resolvedAt?: string;
    refundAmount?: number;
    refundIssued: boolean;
    evidence?: any;
    createdAt: string;
    updatedAt: string;
}
