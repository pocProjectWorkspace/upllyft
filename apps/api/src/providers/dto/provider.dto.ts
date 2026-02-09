// src/providers/dto/provider.dto.ts
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsEnum,
  Min,
  Max 
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProviderDto {
  @IsString()
  state: string;

  @IsString()
  city: string;

  @IsString()
  organizationName: string;

  @IsString()
  organizationType: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  websiteLinkedin?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  websiteLinkedin?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export enum ProviderSortBy {
  NAME = 'name',
  CITY = 'city',
  RECENT = 'recent',
  VIEWS = 'views',
}

export class ProviderFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verifiedOnly?: boolean;

  @IsOptional()
  @IsEnum(ProviderSortBy)
  sortBy?: ProviderSortBy;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ProviderStatsDto {
  totalProviders: number;
  verifiedProviders: number;
  statesCovered: number;
  organizationTypes: number;
  recentlyAdded: number;
  topStates: { state: string; count: number }[];
  topOrganizationTypes: { type: string; count: number }[];
}