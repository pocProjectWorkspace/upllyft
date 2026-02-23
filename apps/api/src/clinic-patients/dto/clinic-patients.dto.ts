import { IsEnum, IsIn, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ClinicStatus } from '@prisma/client';

export class ListPatientsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClinicStatus, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  status?: ClinicStatus[];

  @IsOptional()
  @IsString()
  therapistId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(25)
  ageMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdatePatientStatusDto {
  @IsEnum(ClinicStatus)
  status: ClinicStatus;
}

export class AssignTherapistDto {
  @IsString()
  therapistId: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWalkinPatientDto {
  // Child info
  @IsString()
  firstName: string;

  @IsString()
  dateOfBirth: string; // ISO date string

  @IsString()
  gender: string;

  // Guardian info
  @IsString()
  guardianName: string;

  @IsString()
  guardianPhone: string;

  @IsOptional()
  @IsString()
  guardianEmail?: string;

  @IsOptional()
  @IsString()
  guardianRelationship?: string;

  // Clinical
  @IsOptional()
  @IsString()
  primaryConcern?: string;

  @IsOptional()
  @IsString()
  referralSource?: string;
}
