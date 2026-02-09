// apps/api/src/feeds/dto/feed-filter.dto.ts
import { IsArray, IsOptional, IsNumber, IsString, IsDateString, Min, IsEnum } from 'class-validator';
import { PostType } from '@prisma/client';
import { Type } from 'class-transformer';

export class FeedFilterDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsEnum(PostType, { each: true })
  @IsOptional()
  postTypes?: PostType[];

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minEngagement?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  authorRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeKeywords?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @IsOptional()
  sort?: 'relevance' | 'date' | 'popularity' | 'engagement';
}