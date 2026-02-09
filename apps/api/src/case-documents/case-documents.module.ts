import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import {
  CaseDocumentsController,
  ParentSharedDocumentsController,
} from './case-documents.controller';
import { CaseDocumentsService } from './case-documents.service';
import { DocumentAiService } from './document-ai.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseDocumentsController, ParentSharedDocumentsController],
  providers: [CaseDocumentsService, DocumentAiService],
  exports: [CaseDocumentsService],
})
export class CaseDocumentsModule {}
