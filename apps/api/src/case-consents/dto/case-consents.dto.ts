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
}

export class ListConsentsQueryDto {
  @IsOptional()
  @IsEnum(ConsentType)
  type?: ConsentType;
}
