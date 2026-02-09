import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignWorksheetDto {
  @IsString()
  assignedToId: string;

  @IsString()
  childId: string;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
