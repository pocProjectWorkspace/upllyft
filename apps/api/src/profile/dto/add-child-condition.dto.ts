// apps/api/src/profile/dto/add-child-condition.dto.ts

import { 
  IsString, 
  IsDate, 
  IsOptional, 
  IsArray, 
  IsEnum,
  MaxLength,
  ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConditionType {
  AUTISM_SPECTRUM = 'Autism Spectrum Disorder',
  ADHD = 'ADHD',
  CEREBRAL_PALSY = 'Cerebral Palsy',
  DOWN_SYNDROME = 'Down Syndrome',
  LEARNING_DISABILITIES = 'Learning Disabilities',
  SPEECH_DISORDERS = 'Speech Disorders',
  SENSORY_PROCESSING = 'Sensory Processing Disorder',
  DEVELOPMENTAL_DELAY = 'Developmental Delay',
  DYSLEXIA = 'Dyslexia',
  DYSPRAXIA = 'Dyspraxia',
  INTELLECTUAL_DISABILITY = 'Intellectual Disability',
  ANXIETY_DISORDER = 'Anxiety Disorder',
  OTHER = 'Other',
}

export enum Severity {
  MILD = 'Mild',
  MODERATE = 'Moderate',
  SEVERE = 'Severe',
  PROFOUND = 'Profound',
}

export enum TherapyType {
  SPEECH_THERAPY = 'Speech Therapy',
  OCCUPATIONAL_THERAPY = 'Occupational Therapy (OT)',
  APPLIED_BEHAVIOR_ANALYSIS = 'Applied Behavior Analysis (ABA)',
  PHYSICAL_THERAPY = 'Physical Therapy',
  BEHAVIORAL_THERAPY = 'Behavioral Therapy',
  PLAY_THERAPY = 'Play Therapy',
  MUSIC_THERAPY = 'Music Therapy',
  ART_THERAPY = 'Art Therapy',
  SENSORY_INTEGRATION = 'Sensory Integration Therapy',
  COGNITIVE_BEHAVIORAL_THERAPY = 'Cognitive Behavioral Therapy (CBT)',
  EQUINE_THERAPY = 'Equine Therapy',
  AQUATIC_THERAPY = 'Aquatic Therapy',
}

export class AddChildConditionDto {
  @ApiProperty({ description: 'Child ID to attach condition to' })
  @IsString()
  childId: string;

  @ApiProperty({ 
    description: 'Type of condition',
    enum: ConditionType 
  })
  @IsEnum(ConditionType)
  conditionType: ConditionType;

  @ApiPropertyOptional({ description: 'Date of diagnosis', type: Date })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  diagnosedAt?: Date;

  @ApiPropertyOptional({ description: 'Name of diagnosing doctor/hospital' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  diagnosedBy?: string;

  @ApiPropertyOptional({ 
    description: 'Severity level',
    enum: Severity 
  })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({ description: 'Specific diagnosis or subtype' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  specificDiagnosis?: string;

  @ApiPropertyOptional({ 
    description: 'Current therapies being received',
    type: [String],
    isArray: true
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  currentTherapies?: string[];

  @ApiPropertyOptional({ 
    description: 'Current medications',
    type: [String],
    isArray: true
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  medications?: string[];

  @ApiPropertyOptional({ description: 'Primary challenges faced' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  primaryChallenges?: string;

  @ApiPropertyOptional({ description: 'Child\'s strengths and interests' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  strengths?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateChildConditionDto extends AddChildConditionDto {
  @ApiProperty({ description: 'Condition ID to update' })
  @IsString()
  conditionId: string;
}