import { Module } from '@nestjs/common';
import { LibraryResourcesModule } from '../library-resources/library-resources.module';
import { ResourceJourneyModule } from '../resource-journey/resource-journey.module';
import { MyLibraryController } from './my-library.controller';
import { MyLibraryService } from './my-library.service';

@Module({
  imports: [LibraryResourcesModule, ResourceJourneyModule],
  controllers: [MyLibraryController],
  providers: [MyLibraryService],
})
export class MyLibraryModule {}
