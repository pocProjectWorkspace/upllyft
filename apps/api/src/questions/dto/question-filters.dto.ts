// ============================================
// apps/api/src/questions/dto/question-filters.dto.ts
// ============================================

import { IsOptional, IsString, IsEnum, IsArray, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QuestionFiltersDto {
  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: 'Question status', required: false })
  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED', 'MERGED', 'DUPLICATE'])
  status?: 'OPEN' | 'CLOSED' | 'MERGED' | 'DUPLICATE';

  @ApiProperty({ description: 'Category filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Topics filter', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiProperty({ description: 'Sort order', required: false, default: 'recent' })
  @IsOptional()
  @IsEnum(['recent', 'active', 'popular', 'unanswered', 'most-followed'])
  sort?: 'recent' | 'active' | 'popular' | 'unanswered' | 'most-followed';

  @ApiProperty({ description: 'Filter by accepted answer', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasAcceptedAnswer?: boolean;

  @ApiProperty({ description: 'Show only followed questions', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  following?: boolean;

  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by author ID', required: false })
  @IsOptional()
  @IsString()
  authorId?: string;
}