import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsInt,
} from 'class-validator';
import {
  TherapyDiscipline,
  ClinicalActivityType,
  ClinicalRecordStatus,
} from '@prisma/client';

export class CreateClinicalRecordDto {
  /** The template to instantiate (by id). */
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  /** Captured field values, keyed by field id. */
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}

export class UpdateClinicalRecordDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}

export class ListClinicalRecordsQueryDto {
  @IsOptional()
  @IsEnum(ClinicalActivityType)
  activityType?: ClinicalActivityType;

  @IsOptional()
  @IsEnum(TherapyDiscipline)
  discipline?: TherapyDiscipline;

  @IsOptional()
  @IsEnum(ClinicalRecordStatus)
  status?: ClinicalRecordStatus;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class GenerateRecordReportDto {
  /** Optional audience for the generated report document. */
  @IsOptional()
  @IsString()
  audience?: 'PROFESSIONAL' | 'PARENT';

  @IsOptional()
  @IsString()
  additionalContext?: string;
}
