import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorksheetColorMode,
  WorksheetDifficulty,
} from '@prisma/client';

export class ManualInputDto {
  @IsInt()
  @Min(0)
  @Max(216) // 18 years in months
  childAge: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];

  @IsOptional()
  @IsString()
  developmentalNotes?: string;
}

export class ScreeningInputDto {
  @IsString()
  assessmentId: string;

  @IsString()
  childId: string;
}

export class UploadedReportInputDto {
  @IsString()
  reportUrl: string;

  @IsOptional()
  @IsObject()
  parsedData?: Record<string, any>;

  @IsOptional()
  @IsString()
  childId?: string;
}

export class IEPGoalsInputDto {
  @IsString()
  caseId: string;

  @IsArray()
  @IsString({ each: true })
  goalIds: string[];
}

export class SessionNotesInputDto {
  @IsString()
  caseId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  sessionIds: string[];
}

export class GenerateWorksheetDto {
  @IsEnum(['MANUAL', 'SCREENING', 'UPLOADED_REPORT', 'IEP_GOALS', 'SESSION_NOTES'] as const)
  dataSource: 'MANUAL' | 'SCREENING' | 'UPLOADED_REPORT' | 'IEP_GOALS' | 'SESSION_NOTES';

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualInputDto)
  manualInput?: ManualInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScreeningInputDto)
  screeningInput?: ScreeningInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UploadedReportInputDto)
  uploadedReportInput?: UploadedReportInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IEPGoalsInputDto)
  iepGoalsInput?: IEPGoalsInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionNotesInputDto)
  sessionNotesInput?: SessionNotesInputDto;

  @IsEnum(['ACTIVITY', 'VISUAL_SUPPORT', 'STRUCTURED_PLAN'] as const)
  type: 'ACTIVITY' | 'VISUAL_SUPPORT' | 'STRUCTURED_PLAN';

  @IsString()
  subType: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetDomains: string[];

  @IsEnum(WorksheetDifficulty)
  difficulty: WorksheetDifficulty;

  @IsString()
  interests: string;

  @IsEnum(['5min', '10min', '15min', '20plus'] as const)
  duration: '5min' | '10min' | '15min' | '20plus';

  @IsEnum(['HOME', 'CLINIC', 'SCHOOL', 'OUTDOOR'] as const)
  setting: 'HOME' | 'CLINIC' | 'SCHOOL' | 'OUTDOOR';

  @IsEnum(WorksheetColorMode)
  colorMode: WorksheetColorMode;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  caseId?: string;
}
