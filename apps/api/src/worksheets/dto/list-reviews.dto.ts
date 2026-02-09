import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReviewsDto {
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
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['newest', 'oldest', 'highest', 'lowest', 'most_helpful'] as const)
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'most_helpful' = 'newest';
}
