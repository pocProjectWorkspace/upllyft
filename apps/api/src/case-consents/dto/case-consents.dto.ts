import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ConsentType } from '@prisma/client';

export class CreateCaseConsentDto {
  @IsEnum(ConsentType)
  type: ConsentType;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Phase 1 (UAE): actionable, versioned consent
  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsString()
  consentVersionId?: string;
}

export class ListConsentsQueryDto {
  @IsOptional()
  @IsEnum(ConsentType)
  type?: ConsentType;
}
