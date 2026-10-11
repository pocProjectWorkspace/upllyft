import { Module } from '@nestjs/common';
import { FaqAdminController, FaqController } from './faq.controller';
import { FaqService } from './faq.service';

@Module({
  controllers: [FaqController, FaqAdminController],
  providers: [FaqService],
})
export class FaqModule {}
