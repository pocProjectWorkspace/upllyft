// apps/api/src/comments/dto/report-comment.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  MISINFORMATION = 'MISINFORMATION',
  MEDICAL_ADVICE = 'MEDICAL_ADVICE',
  PHI_DISCLOSURE = 'PHI_DISCLOSURE',
  OTHER = 'OTHER',
}

export class ReportCommentDto {
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  details?: string;
}