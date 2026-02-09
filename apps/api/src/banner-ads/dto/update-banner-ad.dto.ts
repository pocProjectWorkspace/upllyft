import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { AdStatus } from '@prisma/client';
import { CreateBannerAdDto } from './create-banner-ad.dto';

export class UpdateBannerAdDto extends PartialType(CreateBannerAdDto) {
  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus;
}
