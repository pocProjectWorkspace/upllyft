// ============================================
// apps/api/src/answers/dto/comment-answer.dto.ts
// ============================================

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerCommentDto {
  @ApiProperty({ description: 'Comment content', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Comment must be at least 5 characters' })
  content: string;
}