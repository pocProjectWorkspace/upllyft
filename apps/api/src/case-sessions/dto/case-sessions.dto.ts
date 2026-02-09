import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, SessionNoteFormat } from '@prisma/client';

export class CreateCaseSessionDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateCaseSessionDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  actualDuration?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @IsOptional()
  @IsString()
  rawNotes?: string;

  @IsOptional()
  @IsEnum(SessionNoteFormat)
  noteFormat?: SessionNoteFormat;

  @IsOptional()
  @IsObject()
  structuredNotes?: {
    activities?: string[];
    observations?: string;
    parentFeedback?: string;
    homeworkAssigned?: string;
    nextSessionPlan?: string;
  };

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class LogGoalProgressDto {
  @IsString()
  goalId: string;

  @IsOptional()
  @IsString()
  progressNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressValue?: number;
}

export class BulkLogGoalProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogGoalProgressDto)
  entries: LogGoalProgressDto[];
}

export class GenerateAiSummaryDto {
  @IsOptional()
  @IsEnum(SessionNoteFormat)
  format?: SessionNoteFormat;
}

export class ListCaseSessionsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;
}
