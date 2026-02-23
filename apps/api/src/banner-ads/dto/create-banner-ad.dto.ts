import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
} from 'class-validator';
import { AdPlacement, AdStatus } from '@prisma/client';

export class CreateBannerAdDto {
  @IsString()
  title: string;

  @IsUrl()
  imageUrl: string;

  @IsUrl()
  targetUrl: string;

  @IsEnum(AdPlacement)
  placement: AdPlacement;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus;
}
