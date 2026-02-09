// apps/api/src/crisis/dto/crisis-resource.dto.ts

import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsEnum } from 'class-validator';
import { CrisisType } from './create-crisis-incident.dto';

export class CreateCrisisResourceDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // HELPLINE, WHATSAPP, CHAT, EMAIL, IN_PERSON

  @IsArray()
  @IsEnum(CrisisType, { each: true })
  category: CrisisType[];

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsBoolean()
  @IsOptional()
  available24x7?: boolean;

  @IsString()
  @IsOptional()
  operatingHours?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialization?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ageGroups?: string[];
}

export class GetResourcesQueryDto {
  @IsEnum(CrisisType)
  @IsOptional()
  type?: CrisisType;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsBoolean()
  @IsOptional()
  available24x7?: boolean;
}