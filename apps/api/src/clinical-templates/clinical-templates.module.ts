import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicalTemplatesController } from './clinical-templates.controller';
import { ClinicalTemplatesService } from './clinical-templates.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicalTemplatesController],
  providers: [ClinicalTemplatesService],
  exports: [ClinicalTemplatesService],
})
export class ClinicalTemplatesModule {}
