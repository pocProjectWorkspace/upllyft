import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestonePlanDto {
  @IsOptional()
  @IsString()
  assessmentId?: string;
}

export class CreateMilestoneDto {
  @IsString()
  domain: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  expectedAge?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  linkedScreeningId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class BulkCreateMilestonesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones: CreateMilestoneDto[];
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  expectedAge?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsString()
  linkedScreeningId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateMilestonePlanDto {
  @IsOptional()
  @IsBoolean()
  sharedWithParent?: boolean;
}

export class GenerateMilestonePlanDto {
  @IsString()
  assessmentId: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}
