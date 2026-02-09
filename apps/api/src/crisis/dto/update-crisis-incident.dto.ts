// apps/api/src/crisis/dto/update-crisis-incident.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateCrisisIncidentDto, CrisisStatus } from './create-crisis-incident.dto';
import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpdateCrisisIncidentDto extends PartialType(CreateCrisisIncidentDto) {
  @IsEnum(CrisisStatus)
  @IsOptional()
  status?: CrisisStatus;

  @IsDateString()
  @IsOptional()
  resolvedAt?: string;

  @IsString()
  @IsOptional()
  resolvedBy?: string;

  @IsString()
  @IsOptional()
  resolutionNotes?: string;

  @IsString()
  @IsOptional()
  volunteerId?: string;

  @IsDateString()
  @IsOptional()
  followupScheduled?: string;

  @IsBoolean()
  @IsOptional()
  followupCompleted?: boolean;
}