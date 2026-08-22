import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEnum,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MomentCategory, MomentCaptureVia, MiraInsightStatus } from '@prisma/client';
import { DEVELOPMENTAL_DOMAINS } from '../../observations/dto/observations.dto';

export class CreateMomentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsEnum(MomentCategory)
  category?: MomentCategory;

  @IsOptional()
  @IsEnum(MomentCaptureVia)
  capturedVia?: MomentCaptureVia;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  place?: string;

  /** When it actually happened. Defaults to now. */
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  /** Parent-confirmed domain tags from Mira's proposal — never auto-committed. */
  @IsOptional()
  @IsArray()
  @IsIn(DEVELOPMENTAL_DOMAINS, { each: true })
  domainTags?: string[];

  /** Mira's confirmed interpretation (what was heard, follow-up answers). */
  @IsOptional()
  @IsObject()
  interpretation?: Record<string, unknown>;
}

export class ListMomentsQueryDto {
  @IsOptional()
  @IsEnum(MomentCategory)
  category?: MomentCategory;

  @IsOptional()
  @IsIn(DEVELOPMENTAL_DOMAINS)
  domain?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class InterpretMomentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

export class UpdateInsightStatusDto {
  @IsEnum(MiraInsightStatus)
  status!: MiraInsightStatus;
}
