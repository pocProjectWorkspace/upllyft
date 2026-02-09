// apps/api/src/resources/resources.module.ts
// ===================================

import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
})
export class ResourcesModule {}
