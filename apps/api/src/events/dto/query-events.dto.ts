// src/events/dto/query-events.dto.ts
import { IsOptional, IsString, IsEnum, IsArray, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { EventCategory, EventFormat } from '@prisma/client';

export class QueryEventsDto {
  @IsOptional()
  @IsString()
  communityId?: string;

  @IsOptional()
  @IsEnum(EventCategory)
  eventType?: EventCategory;

  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ageGroup?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'startDate' | 'createdAt' | 'interestedCount' = 'startDate';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  offset?: number = 0;
}