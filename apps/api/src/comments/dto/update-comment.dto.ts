// apps/api/src/comments/dto/update-comment.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;
}