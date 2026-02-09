// ============================================
// apps/api/src/answers/dto/accept-answer.dto.ts
// ============================================

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptAnswerDto {
  @ApiProperty({ description: 'Answer ID to accept' })
  @IsString()
  answerId: string;
}