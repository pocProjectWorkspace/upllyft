import { IsString } from 'class-validator';

export class IEPGoalsDataSourceDto {
  @IsString()
  caseId: string;
}
