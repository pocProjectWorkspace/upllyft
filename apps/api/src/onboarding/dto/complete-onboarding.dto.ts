import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OnboardingChildDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  dateOfBirth: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasConditions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

export class CompleteOnboardingDto {
  @ApiProperty({ description: 'What brings the user to Upllyft' })
  @IsString()
  primaryReason: string;

  @ApiPropertyOptional({ description: 'Child info collected during onboarding' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardingChildDto)
  child?: OnboardingChildDto;

  @ApiProperty({ description: 'Top concerns selected by the user' })
  @IsArray()
  @IsString({ each: true })
  concerns: string[];
}
