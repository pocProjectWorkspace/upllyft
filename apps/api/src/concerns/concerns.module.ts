import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ConcernsService } from './concerns.service';
import { ConcernCoachingService } from './concern-coaching.service';
import { ConcernsController, GuardianConcernsController } from './concerns.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ConcernsController, GuardianConcernsController],
  providers: [ConcernsService, ConcernCoachingService],
  exports: [ConcernsService],
})
export class ConcernsModule {}
