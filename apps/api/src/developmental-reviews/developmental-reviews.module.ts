import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { DevelopmentalReviewsService } from './developmental-reviews.service';
import {
  DevelopmentalReviewsController,
  GuardianDevelopmentalReviewsController,
} from './developmental-reviews.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [DevelopmentalReviewsController, GuardianDevelopmentalReviewsController],
  providers: [DevelopmentalReviewsService],
  exports: [DevelopmentalReviewsService],
})
export class DevelopmentalReviewsModule {}
