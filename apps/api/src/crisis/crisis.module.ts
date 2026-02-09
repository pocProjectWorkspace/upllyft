// apps/api/src/crisis/crisis.module.ts

import { Module } from '@nestjs/common';
import { CrisisController } from './crisis.controller';
import { CrisisService } from './crisis.service';
import { CrisisDetectionService } from './crisis-detection.service';
import { CrisisResourcesService } from './crisis-resources.service';
import { CrisisVolunteerService } from './crisis-volunteer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CrisisController],
  providers: [
    CrisisService,
    CrisisDetectionService,
    CrisisResourcesService,
    CrisisVolunteerService,
  ],
  exports: [
    CrisisService,
    CrisisDetectionService,
    CrisisResourcesService,
  ],
})
export class CrisisModule {}