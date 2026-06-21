import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { PayerType, PreAuthStatus, FinancialClearanceStatus } from '@prisma/client';

// ── Insurance policy ──────────────────────────────────────────────────────────
export class CreateInsurancePolicyDto {
  @IsOptional() @IsEnum(PayerType) payerType?: PayerType;
  @IsOptional() @IsString() insurerName?: string;
  @IsOptional() @IsString() sponsorName?: string;
  @IsOptional() @IsString() policyNumber?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() cardDocumentUrl?: string;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsNumber() coPayPercent?: number;
}

export class UpdateInsurancePolicyDto extends CreateInsurancePolicyDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Pre-authorisation ─────────────────────────────────────────────────────────
export class CreatePreAuthorizationDto {
  @IsString() policyId: string;
  @IsOptional() @IsString() caseId?: string;
  @IsOptional() @IsString() serviceCode?: string;
  @IsOptional() @IsString() preAuthNumber?: string;
  @IsOptional() @IsInt() @Min(0) approvedSessions?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
}

export class DecidePreAuthorizationDto {
  @IsEnum(PreAuthStatus) status: PreAuthStatus;
  @IsOptional() @IsString() preAuthNumber?: string;
  @IsOptional() @IsInt() @Min(0) approvedSessions?: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() denialReason?: string;
}

export class RenewPreAuthorizationDto {
  @IsOptional() @IsString() preAuthNumber?: string;
  @IsOptional() @IsInt() @Min(0) approvedSessions?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
}

// ── Financial clearance ───────────────────────────────────────────────────────
export class SetBookingClearanceDto {
  @IsEnum(FinancialClearanceStatus) status: FinancialClearanceStatus;
  @IsOptional() @IsString() note?: string;
}
