// ============================================
// apps/api/src/questions/dto/update-question.dto.ts
// ============================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiProperty({ description: 'Question status', required: false })
  @IsEnum(['OPEN', 'CLOSED'])
  @IsOptional()
  status?: 'OPEN' | 'CLOSED';

  @ApiProperty({ description: 'Reason for closing', required: false })
  @IsString()
  @IsOptional()
  closedReason?: string;
}