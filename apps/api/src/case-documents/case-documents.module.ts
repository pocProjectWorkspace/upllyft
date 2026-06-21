import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseConsentsModule } from '../case-consents/case-consents.module';
import {
  CaseDocumentsController,
  ParentSharedDocumentsController,
} from './case-documents.controller';
import { CaseDocumentsService } from './case-documents.service';
import { DocumentAiService } from './document-ai.service';

@Module({
  imports: [PrismaModule, CasesModule, CaseConsentsModule],
  controllers: [CaseDocumentsController, ParentSharedDocumentsController],
  providers: [CaseDocumentsService, DocumentAiService],
  exports: [CaseDocumentsService],
})
export class CaseDocumentsModule {}
