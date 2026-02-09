import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseAuditService } from './case-audit.service';

@Controller('cases/:caseId/audit')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseAuditController {
  constructor(private auditService: CaseAuditService) {}

  @Get()
  @CaseAccess('view')
  async getAuditLog(
    @Param('caseId') caseId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.getAuditLog(
      caseId,
      cursor,
      parseInt(limit || '50', 10),
      entityType,
      action,
    );
  }

  @Get('summary')
  @CaseAccess('view')
  async getAuditSummary(@Param('caseId') caseId: string) {
    return this.auditService.getAuditSummary(caseId);
  }
}
