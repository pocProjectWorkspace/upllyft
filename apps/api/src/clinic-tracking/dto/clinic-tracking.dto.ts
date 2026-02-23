import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional()
  @IsString()
  caseId?: string | null;
}

export class CreateWalkinBookingDto {
  @IsString()
  childId: string;

  @IsString()
  therapistUserId: string; // therapist's User.id

  @IsDateString()
  scheduledAt: string; // ISO datetime

  @IsOptional()
  @IsInt()
  @Min(15)
  @Type(() => Number)
  durationMins?: number; // default 60

  @IsOptional()
  @IsString()
  sessionType?: string; // e.g. 'OT', 'Speech', 'ABA'

  @IsOptional()
  @IsString()
  caseId?: string;
}
