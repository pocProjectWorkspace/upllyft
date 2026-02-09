import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseDocumentsService } from './case-documents.service';
import { DocumentAiService } from './document-ai.service';
import {
  CreateCaseDocumentDto,
  ShareDocumentDto,
  RevokeShareDto,
  ListDocumentsQueryDto,
  GenerateReportDto,
} from './dto/case-documents.dto';

@Controller('cases/:caseId/documents')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseDocumentsController {
  constructor(
    private documentsService: CaseDocumentsService,
    private documentAiService: DocumentAiService,
  ) {}

  @Post()
  @CaseAccess('edit')
  async createDocument(
    @Param('caseId') caseId: string,
    @Body() dto: CreateCaseDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.createDocument(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listDocuments(
    @Param('caseId') caseId: string,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.listDocuments(caseId, query);
  }

  @Get('shared')
  @CaseAccess('view')
  async getSharedItems(@Param('caseId') caseId: string) {
    return this.documentsService.getSharedItems(caseId);
  }

  @Get(':documentId')
  @CaseAccess('view')
  async getDocument(
    @Param('caseId') caseId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.getDocument(caseId, documentId);
  }

  @Post(':documentId/share')
  @CaseAccess('manage')
  async shareDocument(
    @Param('caseId') caseId: string,
    @Param('documentId') documentId: string,
    @Body() dto: ShareDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.shareDocument(caseId, req.user.id, {
      ...dto,
      documentId,
    });
  }

  @Post('share')
  @CaseAccess('manage')
  async shareCaseAccess(
    @Param('caseId') caseId: string,
    @Body() dto: ShareDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.shareDocument(caseId, req.user.id, dto);
  }

  @Post('revoke-share')
  @CaseAccess('manage')
  async revokeShare(
    @Param('caseId') caseId: string,
    @Body() dto: RevokeShareDto,
    @Req() req: any,
  ) {
    return this.documentsService.revokeShare(caseId, dto.shareId, req.user.id);
  }

  // ─── AI REPORT GENERATION ─────────────────────────────

  @Post('generate-report')
  @CaseAccess('edit')
  async generateReport(
    @Param('caseId') caseId: string,
    @Body() dto: GenerateReportDto,
    @Req() req: any,
  ) {
    const report = await this.documentAiService.generateReport(
      caseId,
      dto.reportType,
      dto.dateFrom,
      dto.dateTo,
      dto.focusAreas,
    );

    // Save as a case document
    const typeMap: Record<string, any> = {
      progress: 'PROGRESS_REPORT',
      case_summary: 'SUMMARY',
      discharge: 'DISCHARGE_SUMMARY',
    };

    const doc = await this.documentsService.createDocument(caseId, req.user.id, {
      type: typeMap[dto.reportType] || 'REPORT',
      title: report.title,
      content: report.content,
    });

    return { report, document: doc };
  }
}

// ─── PARENT PORTAL CONTROLLER ────────────────────────────

@Controller('parent/shared-documents')
@UseGuards(JwtAuthGuard)
export class ParentSharedDocumentsController {
  constructor(private documentsService: CaseDocumentsService) {}

  @Get()
  async getMySharedDocuments(@Req() req: any) {
    return this.documentsService.getParentSharedDocuments(req.user.id);
  }
}
