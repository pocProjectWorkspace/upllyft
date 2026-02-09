// ============================================
// apps/api/src/answers/dto/vote-answer.dto.ts
// ============================================

import { IsInt, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteAnswerDto {
  @ApiProperty({ description: 'Vote value: 1 (helpful) or -1 (not helpful)' })
  @IsInt()
  @IsIn([1, -1], { message: 'Vote must be 1 (helpful) or -1 (not helpful)' })
  value: 1 | -1;
}