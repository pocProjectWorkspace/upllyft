import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IEPStatus, GoalStatus } from '@prisma/client';

// ─── IEP DTOs ────────────────────────────────────────────

export class CreateIEPDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsObject()
  accommodations?: any;

  @IsOptional()
  @IsObject()
  servicesTracking?: any;
}

export class UpdateIEPDto {
  @IsOptional()
  @IsEnum(IEPStatus)
  status?: IEPStatus;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsObject()
  accommodations?: any;

  @IsOptional()
  @IsObject()
  servicesTracking?: any;

  @IsOptional()
  @IsObject()
  meetingNotes?: {
    attendees?: string[];
    decisions?: string[];
    actionItems?: string[];
    notes?: string;
    date?: string;
  };
}

export class ApproveIEPDto {
  @IsEnum(['therapist', 'parent'] as const)
  approverRole: 'therapist' | 'parent';
}

// ─── GOAL DTOs ───────────────────────────────────────────

export class CreateIEPGoalDto {
  @IsString()
  domain: string;

  @IsString()
  goalText: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  baselineScreeningId?: string;

  @IsOptional()
  @IsObject()
  linkedScreeningIndicators?: any;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateIEPGoalDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  goalText?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  currentProgress?: number;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @IsObject()
  linkedScreeningIndicators?: any;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class BulkCreateGoalsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIEPGoalDto)
  goals: CreateIEPGoalDto[];
}

// ─── TEMPLATE DTOs ───────────────────────────────────────

export class CreateIEPTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  content: any; // Template structure with domain placeholders

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdateIEPTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  content?: any;
}

// ─── GOAL BANK DTOs ──────────────────────────────────────

export class CreateGoalBankItemDto {
  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsString()
  goalText: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class SearchGoalBankDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

// ─── AI DTOs ─────────────────────────────────────────────

export class GenerateIEPDto {
  @IsString()
  assessmentId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}

export class SuggestGoalsDto {
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  childAge?: string;

  @IsOptional()
  @IsNumber()
  count?: number;
}

// ─── QUERY DTOs ──────────────────────────────────────────

export class ListIEPsQueryDto {
  @IsOptional()
  @IsEnum(IEPStatus)
  status?: IEPStatus;
}
