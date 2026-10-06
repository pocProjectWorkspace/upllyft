import { Module } from '@nestjs/common';
import { LibraryResourcesModule } from '../library-resources/library-resources.module';
import { JourneyAccessService } from './journey-access.service';
import { JourneyLibraryService } from './journey-library.service';
import { ResourceJourneyController } from './resource-journey.controller';
import { ResourceJourneyService } from './resource-journey.service';

@Module({
  imports: [LibraryResourcesModule],
  controllers: [ResourceJourneyController],
  providers: [ResourceJourneyService, JourneyLibraryService, JourneyAccessService],
  exports: [ResourceJourneyService, JourneyLibraryService, JourneyAccessService],
})
export class ResourceJourneyModule {}
