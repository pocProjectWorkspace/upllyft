// apps/api/src/posts/dto/posts-filter.dto.ts
import { IsOptional, IsString, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '@prisma/client';

export class PostsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  communityId?: string;  // ADD THIS FIELD

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}