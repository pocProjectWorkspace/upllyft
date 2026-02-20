import { Module } from '@nestjs/common';
import { MiraController } from './mira.controller';
import { MiraService } from './mira.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [MiraController],
  providers: [MiraService],
  exports: [MiraService],
})
export class MiraModule {}
