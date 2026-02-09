import { IsString, MinLength, MaxLength } from 'class-validator';

export class SummarizeDto {
  @IsString()
  @MinLength(100, { message: 'Content must be at least 100 characters for summarization' })
  @MaxLength(10000, { message: 'Content must not exceed 10000 characters' })
  content: string;
}