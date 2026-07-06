import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsIn } from 'class-validator';
import { IncidentCategory, IncidentUrgency } from '@prisma/client';

export class CreateEscalationDto {
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @IsOptional()
  @IsEnum(IncidentUrgency)
  urgency?: IncidentUrgency;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  riskLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateEscalationDto {
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @IsOptional()
  @IsEnum(IncidentUrgency)
  urgency?: IncidentUrgency;

  @IsOptional()
  @IsString()
  riskLabel?: string;

  @IsOptional()
  @IsString()
  referralTarget?: string;

  @IsOptional()
  @IsString()
  reviewerNote?: string;

  @IsOptional()
  @IsBoolean()
  reviewerApproved?: boolean;

  @IsOptional()
  @IsBoolean()
  consentObtained?: boolean;

  @IsOptional()
  @IsObject()
  shareScope?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  description?: string;
}

export class FollowUpDto {
  @IsOptional()
  @IsString()
  outcome?: string; // yes | no | pending

  @IsIn(['close', 'continue'])
  action: 'close' | 'continue';
}
