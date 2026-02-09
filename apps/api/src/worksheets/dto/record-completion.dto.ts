import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class RecordCompletionDto {
  @IsString()
  childId: string;

  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeSpentMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  engagementRating?: number;

  @IsOptional()
  @IsEnum(['NONE', 'MINIMAL', 'MODERATE', 'SIGNIFICANT'] as const)
  helpLevel?: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';

  @IsOptional()
  @IsEnum(['TOO_EASY', 'JUST_RIGHT', 'CHALLENGING', 'TOO_HARD'] as const)
  completionQuality?: 'TOO_EASY' | 'JUST_RIGHT' | 'CHALLENGING' | 'TOO_HARD';

  @IsOptional()
  @IsString()
  parentNotes?: string;
}

export class UpdateCompletionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  timeSpentMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  engagementRating?: number;

  @IsOptional()
  @IsEnum(['NONE', 'MINIMAL', 'MODERATE', 'SIGNIFICANT'] as const)
  helpLevel?: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';

  @IsOptional()
  @IsEnum(['TOO_EASY', 'JUST_RIGHT', 'CHALLENGING', 'TOO_HARD'] as const)
  completionQuality?: 'TOO_EASY' | 'JUST_RIGHT' | 'CHALLENGING' | 'TOO_HARD';

  @IsOptional()
  @IsString()
  parentNotes?: string;
}
