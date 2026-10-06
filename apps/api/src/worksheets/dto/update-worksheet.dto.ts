import { IsString, IsOptional, IsObject, IsArray, IsInt, Min, Max, MaxLength } from 'class-validator';

export class UpdateWorksheetDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTags?: string[];

  // ── Resources journey: how families find and use it ──

  /** Journey area keys (comm, social, daily, fine, gross, learn, sensory, behav). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  journeyDomains?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  ageRangeMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  ageRangeMax?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  practises?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  forText?: string;
}
