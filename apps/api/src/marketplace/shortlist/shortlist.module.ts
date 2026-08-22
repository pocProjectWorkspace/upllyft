import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShortlistController } from './shortlist.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ShortlistController],
})
export class ShortlistModule {}
