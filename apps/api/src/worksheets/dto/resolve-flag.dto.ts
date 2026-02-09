import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorksheetFlagStatus } from '@prisma/client';

export class ResolveFlagDto {
  @IsEnum([WorksheetFlagStatus.DISMISSED, WorksheetFlagStatus.ACTIONED, WorksheetFlagStatus.REVIEWED])
  status: WorksheetFlagStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution?: string;
}
