// apps/api/src/ai/dto/generate-tags.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class GenerateTagsDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  content: string;
}
