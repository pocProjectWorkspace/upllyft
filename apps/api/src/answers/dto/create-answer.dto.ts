// ============================================
// apps/api/src/answers/dto/create-answer.dto.ts
// ============================================

import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  MinLength 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Answer content', minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Answer must be at least 20 characters' })
  content: string;

  @ApiProperty({ description: 'Post anonymously', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiProperty({ description: 'Has media attachments', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  hasMedia?: boolean;
}