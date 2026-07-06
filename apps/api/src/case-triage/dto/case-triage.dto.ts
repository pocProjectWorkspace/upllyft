import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TriageDecision, TriagePathway, RiskLevel } from '@prisma/client';

export class TriageAppointmentDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  durationMin?: number;

  @IsOptional()
  @IsString()
  location?: string;
}

export class TriageNotifyDto {
  @IsOptional()
  @IsString()
  channel?: string; // app | sms | call

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  requireAck?: boolean;
}

export class ConfirmTriageDto {
  @IsEnum(TriageDecision)
  decision: TriageDecision;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsEnum(TriagePathway)
  pathway?: TriagePathway;

  @IsOptional()
  @IsString()
  primaryTherapistId?: string; // TherapistProfile id

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryTherapistIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TriageAppointmentDto)
  appointment?: TriageAppointmentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TriageNotifyDto)
  notify?: TriageNotifyDto;

  @IsOptional()
  @IsObject()
  riskFlags?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  aiSummary?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
