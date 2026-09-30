// apps/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

import { CareWaitlistModule } from '../care-waitlist/care-waitlist.module';
@Module({
  imports: [PrismaModule, UsersModule, CareWaitlistModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}