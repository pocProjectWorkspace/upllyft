import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import {
  GuardianRelationship,
  GuardianAccessLevel,
  IdentityDocType,
  PreVisitTaskType,
  PreVisitTaskStatus,
  ConsentType,
} from '@prisma/client';

// ── Guardian ────────────────────────────────────────────────────────────────
export class CreateGuardianDto {
  @IsString() fullName: string;
  @IsEnum(GuardianRelationship) relationship: GuardianRelationship;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsBoolean() hasAuthorityToConsent?: boolean;
  @IsOptional() @IsBoolean() isPrimaryContact?: boolean;
  @IsOptional() @IsBoolean() isEmergencyContact?: boolean;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(GuardianAccessLevel) accessLevel?: GuardianAccessLevel;
}

export class UpdateGuardianDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEnum(GuardianRelationship) relationship?: GuardianRelationship;
  @IsOptional() @IsBoolean() hasAuthorityToConsent?: boolean;
  @IsOptional() @IsBoolean() isPrimaryContact?: boolean;
  @IsOptional() @IsBoolean() isEmergencyContact?: boolean;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(GuardianAccessLevel) accessLevel?: GuardianAccessLevel;
}

// ── Identity ──────────────────────────────────────────────────────────────────
export class CaptureIdentityDto {
  @IsEnum(IdentityDocType) identityType: IdentityDocType;
  @IsOptional() @IsString() emiratesId?: string;
  @IsOptional() @IsDateString() emiratesIdExpiry?: string;
  @IsOptional() @IsString() passportNumber?: string;
  @IsOptional() @IsString() documentFileUrl?: string;
}

// ── Pre-visit task ──────────────────────────────────────────────────────────
export class CreatePreVisitTaskDto {
  @IsEnum(PreVisitTaskType) type: PreVisitTaskType;
  @IsString() label: string;
  @IsOptional() @IsString() caseId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class UpdatePreVisitTaskDto {
  @IsEnum(PreVisitTaskStatus) status: PreVisitTaskStatus;
}

// ── Consent template / version ──────────────────────────────────────────────
export class CreateConsentTemplateDto {
  @IsEnum(ConsentType) type: ConsentType;
  @IsString() name: string;
  @IsOptional() @IsString() clinicId?: string;
}

export class PublishConsentVersionDto {
  @IsString() purpose: string;
  @IsOptional() @IsString() bodyUrl?: string;
  @IsOptional() @IsString() bodyHash?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
}
