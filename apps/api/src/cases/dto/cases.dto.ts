import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDateString,
} from 'class-validator';
import { CaseStatus, CaseTherapistRole } from '@prisma/client';

export class CreateCaseDto {
  @IsString()
  childId: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
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
