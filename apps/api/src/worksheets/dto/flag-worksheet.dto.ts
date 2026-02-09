import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorksheetFlagReason } from '@prisma/client';

export class FlagWorksheetDto {
  @IsEnum(WorksheetFlagReason)
  reason: WorksheetFlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
