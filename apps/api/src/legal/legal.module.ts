import { Module } from '@nestjs/common';
import { AdminLegalController, LegalController } from './legal.controller';
import { LegalAcceptanceService } from './legal-acceptance.service';
import { LegalDocumentsService } from './legal-documents.service';

@Module({
  controllers: [LegalController, AdminLegalController],
  providers: [LegalAcceptanceService, LegalDocumentsService],
  exports: [LegalAcceptanceService, LegalDocumentsService],
})
export class LegalModule {}
