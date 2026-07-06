import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { AssessmentReviewsController } from './assessment-reviews.controller';
import { AssessmentReviewsService } from './assessment-reviews.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [AssessmentReviewsController],
  providers: [AssessmentReviewsService],
  exports: [AssessmentReviewsService],
})
export class AssessmentReviewsModule {}
