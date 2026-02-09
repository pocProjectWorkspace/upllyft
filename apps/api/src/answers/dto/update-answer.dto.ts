// ============================================
// apps/api/src/answers/dto/update-answer.dto.ts
// ============================================

import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAnswerDto {
  @ApiProperty({ description: 'Updated answer content', minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Answer must be at least 20 characters' })
  content: string;

  @ApiProperty({ description: 'Reason for edit', required: false })
  @IsString()
  @IsOptional()
  editReason?: string;
}