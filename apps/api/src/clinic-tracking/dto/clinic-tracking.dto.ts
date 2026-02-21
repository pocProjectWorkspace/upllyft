import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TrackingStatus } from '@prisma/client';

export class TrackingQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string; // YYYY-MM-DD, defaults to today
}

export class UpdateTrackingStatusDto {
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
