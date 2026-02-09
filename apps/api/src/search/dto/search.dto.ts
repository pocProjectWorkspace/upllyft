// apps/api/src/search/dto/search.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  authorRole?: string;

  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'relevance' | 'recent' | 'popular';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;
}