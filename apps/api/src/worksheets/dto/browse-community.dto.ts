import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WorksheetType, WorksheetDifficulty } from '@prisma/client';

export class BrowseCommunityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsEnum(WorksheetType)
  type?: WorksheetType;

  @IsOptional()
  @IsEnum(WorksheetDifficulty)
  difficulty?: WorksheetDifficulty;

  @IsOptional()
  @IsString()
  subType?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(216)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(216)
  ageMax?: number;

  @IsOptional()
  @IsEnum(['newest', 'highest_rated', 'most_cloned', 'title'] as const)
  sortBy?: 'newest' | 'highest_rated' | 'most_cloned' | 'title' = 'newest';
}
