// ============================================
// apps/api/src/answers/dto/answer-filters.dto.ts
// ============================================

import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerFiltersDto {
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

  @ApiProperty({ description: 'Sort order', required: false, default: 'best' })
  @IsOptional()
  @IsEnum(['best', 'recent', 'oldest'])
  sort?: 'best' | 'recent' | 'oldest';
}