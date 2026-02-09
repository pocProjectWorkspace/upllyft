// apps/api/src/feeds/dto/create-feed-preference.dto.ts
import { IsEnum, IsArray, IsNumber, IsBoolean, IsOptional, Min, Max, IsString } from 'class-validator';
import { FeedView, FeedDensity } from '@prisma/client';

export class CreateFeedPreferenceDto {
  @IsEnum(FeedView)
  @IsOptional()
  defaultFeedView?: FeedView;

  @IsEnum(FeedDensity)
  @IsOptional()
  feedDensity?: FeedDensity;

  @IsBoolean()
  @IsOptional()
  showAnonymousPosts?: boolean;

  @IsBoolean()
  @IsOptional()
  autoplayVideos?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mutedKeywords?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mutedAuthors?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLanguages?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  recencyWeight?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  relevanceWeight?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  engagementWeight?: number;
}