// apps/api/src/community/community.module.ts
import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityController],
  providers: [CommunityService, WhatsAppService],
  exports: [CommunityService, WhatsAppService],
})
export class CommunityModule {}