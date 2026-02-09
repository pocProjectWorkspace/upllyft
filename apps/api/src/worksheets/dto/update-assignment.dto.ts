import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorksheetAssignmentStatus } from '@prisma/client';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsEnum(WorksheetAssignmentStatus)
  status?: WorksheetAssignmentStatus;

  @IsOptional()
  @IsString()
  parentNotes?: string;
}
