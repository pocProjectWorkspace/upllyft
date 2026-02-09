// apps/api/src/users/dto/update-profile.dto.ts
import { IsString, IsOptional, IsNumber, IsArray, IsUrl, MaxLength, Min, Max } from 'class-validator';

export class UpdateAuthProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialization?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  education?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(200)
  organization?: string;
}
