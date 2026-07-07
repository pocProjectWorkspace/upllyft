import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsIn,
  IsDateString,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, SessionNoteFormat, TherapyDiscipline } from '@prisma/client';

// "+ Add session" — book a single session or a recurring block, any discipline.
export class CreateSessionBlockDto {
  @IsIn(['single', 'recurring'])
  bookingType: 'single' | 'recurring';

  @IsOptional()
  @IsEnum(TherapyDiscipline)
  discipline?: TherapyDiscipline;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // single
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  // recurring
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  count?: number;
}

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
  structuredNotes?: Record<string, unknown>;
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
  structuredNotes?: Record<string, unknown>;

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
