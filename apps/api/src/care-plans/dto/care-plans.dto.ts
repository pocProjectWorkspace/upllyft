import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsDateString,
  ArrayNotEmpty,
  Min,
  Max,
} from 'class-validator';
import {
  CarePlanRecommendation,
  CarePlanPaymentStatus,
  TherapyDiscipline,
} from '@prisma/client';

export class CreateCarePlanDto {
  @IsOptional()
  @IsString()
  consultationRecordId?: string;

  @IsOptional()
  @IsString()
  consultationNotes?: string;

  @IsEnum(CarePlanRecommendation)
  recommendation: CarePlanRecommendation;

  @IsOptional()
  @IsArray()
  @IsEnum(TherapyDiscipline, { each: true })
  disciplines?: TherapyDiscipline[];

  @IsOptional()
  @IsString()
  primaryTherapistId?: string;

  @IsDateString()
  startDate: string;

  @IsString()
  timeOfDay: string; // "16:00"

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[]; // 0=Sun … 6=Sat

  @IsInt()
  @Min(0)
  @Max(60)
  sessionCount: number;

  @IsOptional()
  @IsString()
  packageName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsEnum(CarePlanPaymentStatus)
  paymentStatus?: CarePlanPaymentStatus;

  // Branch data
  @IsOptional()
  @IsInt()
  @Min(1)
  reviewInWeeks?: number;

  @IsOptional()
  @IsString()
  externalReferralTarget?: string;
}

export class UpdateCarePlanDto {
  @IsOptional()
  @IsEnum(CarePlanRecommendation)
  recommendation?: CarePlanRecommendation;

  @IsOptional()
  @IsArray()
  @IsEnum(TherapyDiscipline, { each: true })
  disciplines?: TherapyDiscipline[];

  @IsOptional()
  @IsString()
  primaryTherapistId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  timeOfDay?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  sessionCount?: number;

  @IsOptional()
  @IsString()
  packageName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsEnum(CarePlanPaymentStatus)
  paymentStatus?: CarePlanPaymentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewInWeeks?: number;

  @IsOptional()
  @IsString()
  externalReferralTarget?: string;
}

/** Stateless schedule preview (no persistence) — powers the live dated list in the UI. */
export class PreviewScheduleDto {
  @IsDateString()
  startDate: string;

  @IsString()
  timeOfDay: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @IsInt()
  @Min(1)
  @Max(60)
  sessionCount: number;
}
