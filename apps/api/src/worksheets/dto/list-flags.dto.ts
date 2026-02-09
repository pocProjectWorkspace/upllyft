import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorksheetFlagStatus, WorksheetFlagReason } from '@prisma/client';

export class ListFlagsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(WorksheetFlagStatus)
  status?: WorksheetFlagStatus;

  @IsOptional()
  @IsEnum(WorksheetFlagReason)
  reason?: WorksheetFlagReason;
}
