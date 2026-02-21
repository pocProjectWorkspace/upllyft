import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CredentialStatus } from '@prisma/client';

export class ListTherapistsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  availability?: string; // 'available' | 'busy' | 'off'

  @IsOptional()
  @IsEnum(CredentialStatus)
  credentialStatus?: CredentialStatus;
}

export class TherapistScheduleQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  therapistId?: string;
}

export class UpdateCredentialsDto {
  @IsOptional()
  @IsString()
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  licenceExpiry?: string;

  @IsOptional()
  @IsEnum(CredentialStatus)
  credentialStatus?: CredentialStatus;
}
