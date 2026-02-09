import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { BillingStatus } from '@prisma/client';

export class CreateCaseBillingDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateCaseBillingDto {
  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  invoiceUrl?: string;
}

export class ListBillingQueryDto {
  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
