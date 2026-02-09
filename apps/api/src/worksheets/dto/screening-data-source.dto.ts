import { IsString } from 'class-validator';

export class ScreeningDataSourceDto {
  @IsString()
  childId: string;
}

export class ScreeningSummaryDto {
  @IsString()
  assessmentId: string;
}
