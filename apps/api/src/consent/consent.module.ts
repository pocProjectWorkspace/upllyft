import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ConsentController } from './consent.controller';
import { ChildConsentController } from './child-consent.controller';
import { ConsentService } from './consent.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ConsentController, ChildConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
