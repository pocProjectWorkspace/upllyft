import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
  IsDateString,
  ArrayNotEmpty,
} from 'class-validator';
import {
  AssessmentReviewType,
  AssessmentPhase,
  AssessmentExecStatus,
  CarePlanPaymentStatus,
  TherapyDiscipline,
} from '@prisma/client';

export class CreateAssessmentReviewDto {
  @IsEnum(AssessmentReviewType)
  type: AssessmentReviewType;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TherapyDiscipline, { each: true })
  disciplines: TherapyDiscipline[];

  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateAssessmentReviewDto {
  @IsOptional()
  @IsEnum(AssessmentPhase)
  phase?: AssessmentPhase;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  scopeText?: string;

  @IsOptional()
  @IsBoolean()
  scopeApproved?: boolean;

  @IsOptional()
  @IsString()
  dayMode?: string;

  @IsOptional()
  @IsBoolean()
  questionnaireSent?: boolean;

  @IsOptional()
  @IsBoolean()
  schoolInputRequested?: boolean;

  @IsOptional()
  @IsEnum(CarePlanPaymentStatus)
  paymentStatus?: CarePlanPaymentStatus;

  @IsOptional()
  @IsDateString()
  meetingAt?: string;

  @IsOptional()
  @IsString()
  syncMode?: string;

  @IsOptional()
  @IsString()
  reportText?: string;

  @IsOptional()
  @IsString()
  approval?: string;
}

export class AddDisciplineDto {
  @IsEnum(TherapyDiscipline)
  discipline: TherapyDiscipline;

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}

export class UpdateDisciplineDto {
  @IsOptional()
  @IsEnum(AssessmentExecStatus)
  status?: AssessmentExecStatus;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  clinicalRecordId?: string;

  @IsOptional()
  @IsString()
  reportTitle?: string;
}

export class ShareReportDto {
  @IsObject()
  recipients: { parent?: boolean; school?: boolean; doctor?: boolean };
}
