import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorksheetAssignmentStatus } from '@prisma/client';

export class ListAssignmentsDto {
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
  limit?: number = 12;

  @IsOptional()
  @IsEnum(WorksheetAssignmentStatus)
  status?: WorksheetAssignmentStatus;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  caseId?: string;
}
