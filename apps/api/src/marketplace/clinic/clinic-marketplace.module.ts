import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClinicMarketplaceController } from './clinic-marketplace.controller';
import { ClinicMarketplaceService } from './clinic-marketplace.service';
import { MatchingService } from '../matching/matching.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicMarketplaceController],
  providers: [ClinicMarketplaceService, MatchingService],
  exports: [ClinicMarketplaceService],
})
export class ClinicMarketplaceModule {}
