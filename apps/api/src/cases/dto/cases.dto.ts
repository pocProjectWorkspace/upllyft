import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import {
  CaseStatus,
  CaseTherapistRole,
  AttendanceStatus,
  SessionNoteFormat,
} from '@prisma/client';

export class CreateCaseDto {
  @IsString()
  childId: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  referralSource?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCaseStatusDto {
  @IsEnum(CaseStatus)
  status: CaseStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCaseTherapistDto {
  @IsString()
  therapistId: string;

  @IsOptional()
  @IsEnum(CaseTherapistRole)
  role?: CaseTherapistRole;

  @IsOptional()
  @IsObject()
  permissions?: {
    canEdit?: boolean;
    canViewNotes?: boolean;
    canManageGoals?: boolean;
  };
}

export class UpdateCaseTherapistDto {
  @IsOptional()
  @IsEnum(CaseTherapistRole)
  role?: CaseTherapistRole;

  @IsOptional()
  @IsObject()
  permissions?: {
    canEdit?: boolean;
    canViewNotes?: boolean;
    canManageGoals?: boolean;
  };
}

export class TransferCaseDto {
  @IsString()
  newPrimaryTherapistId: string;
}

export class CreateInternalNoteDto {
  @IsString()
  content: string;
}

export class ListCasesQueryDto {
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

// ─── SESSION DTOs ─────────────────────────────────────────

export class CreateSessionDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  actualDuration?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @IsOptional()
  @IsEnum(SessionNoteFormat)
  noteFormat?: SessionNoteFormat;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  rawNotes?: string;

  @IsOptional()
  @IsObject()
  structuredNotes?: Record<string, unknown>;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  actualDuration?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @IsOptional()
  @IsEnum(SessionNoteFormat)
  noteFormat?: SessionNoteFormat;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  rawNotes?: string;

  @IsOptional()
  @IsObject()
  structuredNotes?: Record<string, unknown>;
}
