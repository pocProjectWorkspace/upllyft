import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorksheetType, WorksheetStatus, WorksheetDifficulty } from '@prisma/client';

export class ListWorksheetsDto {
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
  @IsEnum(WorksheetStatus)
  status?: WorksheetStatus;

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
  childId?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'title', 'updatedAt'] as const)
  sortBy?: 'createdAt' | 'title' | 'updatedAt' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sortOrder?: 'asc' | 'desc' = 'desc';
}
