import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LibraryResourcesController } from './library-resources.controller';
import { LibraryResourcesService } from './library-resources.service';

@Module({
  imports: [PrismaModule],
  controllers: [LibraryResourcesController],
  providers: [LibraryResourcesService],
})
export class LibraryResourcesModule {}
