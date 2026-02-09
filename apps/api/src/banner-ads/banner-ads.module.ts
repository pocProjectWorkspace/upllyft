import { Module } from '@nestjs/common';
import { BannerAdsController } from './banner-ads.controller';
import { BannerAdsService } from './banner-ads.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BannerAdsController],
  providers: [BannerAdsService],
  exports: [BannerAdsService],
})
export class BannerAdsModule {}
