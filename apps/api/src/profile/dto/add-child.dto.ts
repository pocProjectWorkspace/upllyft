// apps/api/src/profile/dto/add-child.dto.ts

import {
  IsString,
  IsDate,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  ValidateIf
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
  PREFER_NOT_TO_SAY = 'Prefer not to say',
}

export enum SchoolType {
  MAINSTREAM = 'Mainstream',
  SPECIAL_SCHOOL = 'Special School',
  HOMESCHOOLED = 'Homeschooled',
  NOT_IN_SCHOOL = 'Not in school',
}

export enum DiagnosisStatus {
  DIAGNOSED = 'Diagnosed',
  SUSPECTED = 'Suspected',
  UNDER_EVALUATION = 'Under Evaluation',
  NONE = 'None',
}

export class AddChildDto {
  @ApiProperty({ description: 'Child\'s first name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiPropertyOptional({ description: 'Child\'s nickname' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string;

  @ApiProperty({ description: 'Child\'s date of birth', type: String, example: '2020-01-15' })
  @Type(() => Date)
  @IsDate()
  dateOfBirth: Date;

  @ApiProperty({ description: 'Child\'s gender', enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ description: 'Type of school', enum: SchoolType })
  @IsEnum(SchoolType)
  @IsOptional()
  schoolType?: SchoolType;

  @ApiPropertyOptional({ description: 'Grade/Class' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional({ description: 'Does the child have a diagnosed or suspected condition?', default: false })
  @IsBoolean()
  @IsOptional()
  hasCondition?: boolean;

  @ApiPropertyOptional({ description: 'Diagnosis status', enum: DiagnosisStatus })
  @IsEnum(DiagnosisStatus)
  @IsOptional()
  @ValidateIf(o => o.hasCondition === true)
  diagnosisStatus?: DiagnosisStatus;

  // Basic Information (DST fields)
  @ApiPropertyOptional({ description: 'Birth order' })
  @IsString()
  @IsOptional()
  birthOrder?: string;

  @ApiPropertyOptional({ description: 'Nationality' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Primary language(s) spoken at home' })
  @IsString()
  @IsOptional()
  primaryLanguage?: string;

  @ApiPropertyOptional({ description: 'Place of birth' })
  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @ApiPropertyOptional({ description: 'Caregiver relationship' })
  @IsString()
  @IsOptional()
  caregiverRelationship?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  // Educational Information (DST fields)
  @ApiPropertyOptional({ description: 'Current school name' })
  @IsString()
  @IsOptional()
  currentSchool?: string;

  @ApiPropertyOptional({ description: 'Medium of instruction' })
  @IsString()
  @IsOptional()
  mediumOfInstruction?: string;

  @ApiPropertyOptional({ description: 'Attendance pattern' })
  @IsString()
  @IsOptional()
  attendancePattern?: string;

  @ApiPropertyOptional({ description: 'Teacher concerns' })
  @IsString()
  @IsOptional()
  teacherConcerns?: string;

  @ApiPropertyOptional({ description: 'Learning difficulties' })
  @IsString()
  @IsOptional()
  learningDifficulties?: string;

  // Medical & Birth History (DST fields)
  @ApiPropertyOptional({ description: "Mother's health during pregnancy" })
  @IsString()
  @IsOptional()
  mothersHealthDuringPregnancy?: string;

  @ApiPropertyOptional({ description: 'Delivery type' })
  @IsString()
  @IsOptional()
  deliveryType?: string;

  @ApiPropertyOptional({ description: 'Premature birth' })
  @IsBoolean()
  @IsOptional()
  prematureBirth?: boolean;

  @ApiPropertyOptional({ description: 'Gestational age (in weeks)' })
  @IsString()
  @IsOptional()
  gestationalAge?: string;

  @ApiPropertyOptional({ description: 'Birth weight' })
  @IsString()
  @IsOptional()
  birthWeight?: string;

  @ApiPropertyOptional({ description: 'Birth complications' })
  @IsString()
  @IsOptional()
  birthComplications?: string;

  @ApiPropertyOptional({ description: 'Delayed milestones' })
  @IsBoolean()
  @IsOptional()
  delayedMilestones?: boolean;

  @ApiPropertyOptional({ description: 'Delayed milestones details' })
  @IsString()
  @IsOptional()
  delayedMilestonesDetails?: string;

  // Current Medical Information (DST fields)
  @ApiPropertyOptional({ description: 'Current medical conditions' })
  @IsString()
  @IsOptional()
  currentMedicalConditions?: string;

  @ApiPropertyOptional({ description: 'Vision/hearing issues' })
  @IsString()
  @IsOptional()
  visionHearingIssues?: string;

  @ApiPropertyOptional({ description: 'Taking medications' })
  @IsBoolean()
  @IsOptional()
  takingMedications?: boolean;

  @ApiPropertyOptional({ description: 'Medication details' })
  @IsString()
  @IsOptional()
  medicationDetails?: string;

  @ApiPropertyOptional({ description: 'Family history of developmental disorders' })
  @IsString()
  @IsOptional()
  familyHistoryOfDevelopmentalDisorders?: string;

  @ApiPropertyOptional({ description: 'Sleep issues' })
  @IsBoolean()
  @IsOptional()
  sleepIssues?: boolean;

  @ApiPropertyOptional({ description: 'Sleep details' })
  @IsString()
  @IsOptional()
  sleepDetails?: string;

  @ApiPropertyOptional({ description: 'Eating issues' })
  @IsBoolean()
  @IsOptional()
  eatingIssues?: boolean;

  @ApiPropertyOptional({ description: 'Eating details' })
  @IsString()
  @IsOptional()
  eatingDetails?: string;

  @ApiPropertyOptional({ description: 'Developmental concerns' })
  @IsString()
  @IsOptional()
  developmentalConcerns?: string;

  @ApiPropertyOptional({ description: 'Previous assessments' })
  @IsBoolean()
  @IsOptional()
  previousAssessments?: boolean;

  @ApiPropertyOptional({ description: 'Referral source' })
  @IsString()
  @IsOptional()
  referralSource?: string;
}

export class UpdateChildDto extends AddChildDto {
  @ApiProperty({ description: 'Child ID' })
  @IsString()
  childId: string;
}