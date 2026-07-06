import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class SaveCaseIntakeDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  presentingConcern?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referralQuestions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentGoals?: string[];

  @IsOptional()
  @IsString()
  urgencyFlag?: string;

  @IsOptional()
  @IsBoolean()
  consentAssessment?: boolean;

  @IsOptional()
  @IsBoolean()
  consentTherapy?: boolean;

  @IsOptional()
  @IsBoolean()
  consentSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  consentAi?: boolean;

  @IsOptional()
  @IsString()
  recordedBy?: string;
}
