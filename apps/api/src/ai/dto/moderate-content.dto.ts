// apps/api/src/ai/dto/moderate-content.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ModerateContentDto {
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content: string;
}