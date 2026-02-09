// apps/api/src/ai/dto/extract-insights.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ExtractInsightsDto {
  @IsString()
  @MinLength(100)
  @MaxLength(10000)
  content: string;
}