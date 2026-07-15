import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ObservationType } from '@prisma/client';

/**
 * The 8 developmental domains — the SAME vocabulary the screening uses. Tagging an
 * observation with one is what lets it accumulate as evidence against the same domain a
 * screening flags. A free note with no domain is allowed (null); a domain OUTSIDE this
 * set is not, because it would never line up with anything.
 */
export const DEVELOPMENTAL_DOMAINS = [
  'grossMotor',
  'fineMotor',
  'speechLanguage',
  'socialEmotional',
  'cognitiveLearning',
  'adaptiveSelfCare',
  'sensoryProcessing',
  'visionHearing',
] as const;

export class CreateObservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note!: string;

  @IsOptional()
  @IsIn(DEVELOPMENTAL_DOMAINS)
  domain?: string;

  @IsOptional()
  @IsEnum(ObservationType)
  type?: ObservationType;

  /** When it actually happened. Defaults to now if the keyworker is writing it up live. */
  @IsOptional()
  @IsDateString()
  observedAt?: string;
}

export class ListObservationsQueryDto {
  @IsOptional()
  @IsIn(DEVELOPMENTAL_DOMAINS)
  domain?: string;

  @IsOptional()
  @IsEnum(ObservationType)
  type?: ObservationType;
}
