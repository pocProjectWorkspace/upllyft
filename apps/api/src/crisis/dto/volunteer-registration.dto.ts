// apps/api/src/crisis/dto/volunteer-registration.dto.ts

import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { CrisisType } from './create-crisis-incident.dto';

export class VolunteerRegistrationDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsArray()
  @IsEnum(CrisisType, { each: true })
  specializations: CrisisType[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsString()
  state: string;

  @IsString()
  city: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsNumber()
  @IsOptional()
  maxCasesPerDay?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class UpdateVolunteerAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsString()
  @IsOptional()
  availableFrom?: string;

  @IsString()
  @IsOptional()
  availableTill?: string;
}