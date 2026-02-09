// apps/api/src/ai/dto/suggest-resources.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SuggestResourcesDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  topic: string;
}