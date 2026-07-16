import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  GoalStatus,
  InterventionKind,
  SupportReviewDecision,
} from '@prisma/client';

/** An outcome supplied at plan-creation time, or added later. */
export class OutcomeInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  domain!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  outcomeText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  successCriteria?: string;

  @IsOptional()
  @IsNumber()
  baselineValue?: number;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  reviewIntervalDays?: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateSupportPlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  /** A short, parent-facing summary of what the nursery is doing and why. */
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  summary?: string;

  /** Staff-private working notes — never on the guardian path. */
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  staffNotes?: string;

  /** The concern this plan responds to, where it grew from one. */
  @IsOptional()
  @IsString()
  concernId?: string;

  @IsOptional()
  @IsString()
  reviewDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OutcomeInputDto)
  outcomes?: OutcomeInputDto[];
}

export class UpdateSupportPlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  staffNotes?: string;

  @IsOptional()
  @IsString()
  reviewDate?: string;
}

export class UpdateOutcomeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  outcomeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  successCriteria?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  currentProgress?: number;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @IsString()
  targetDate?: string;
}

export class AddInterventionDto {
  @IsEnum(InterventionKind)
  kind!: InterventionKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  /** When this is a home worksheet, the WorksheetAssignment carrying it to the parent. */
  @IsOptional()
  @IsString()
  worksheetAssignmentId?: string;
}

/** One outcome's progress at a review point. */
export class OutcomeProgressDto {
  @IsString()
  @IsNotEmpty()
  outcomeId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}

export class AddReviewDto {
  @IsEnum(SupportReviewDecision)
  decision!: SupportReviewDecision;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  progressNote?: string;

  @IsOptional()
  @IsBoolean()
  sharedWithParent?: boolean;

  /** The next review date, set when the cycle continues. */
  @IsOptional()
  @IsString()
  nextReviewDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OutcomeProgressDto)
  outcomeUpdates?: OutcomeProgressDto[];
}

export class AcknowledgeSupportPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;
}
