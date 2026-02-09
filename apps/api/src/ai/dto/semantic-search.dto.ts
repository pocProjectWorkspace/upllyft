// apps/api/src/ai/dto/semantic-search.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SemanticSearchDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  query: string;
}
