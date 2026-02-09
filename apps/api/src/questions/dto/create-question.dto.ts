// ============================================
// apps/api/src/questions/dto/create-question.dto.ts
// ============================================

import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsBoolean, 
  MinLength, 
  MaxLength 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question title', minLength: 10, maxLength: 200 })
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title: string;

  @ApiProperty({ description: 'Question content/description' })
  @IsString()
  @MinLength(20, { message: 'Content must be at least 20 characters' })
  content: string;

  @ApiProperty({ description: 'Category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Topics', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topics?: string[];

  @ApiProperty({ description: 'Tags', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Post anonymously', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}