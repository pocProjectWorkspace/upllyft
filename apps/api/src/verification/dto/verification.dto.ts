// apps/api/src/verification/dto/verification.dto.ts
import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationStatus } from '@prisma/client';

export class UploadDocumentsDto {
  @IsString()
  documentType: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVerificationStatusDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetVerificationQueueDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus = VerificationStatus.PENDING;
}