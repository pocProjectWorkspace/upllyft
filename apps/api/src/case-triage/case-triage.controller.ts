import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseTriageService } from './case-triage.service';
import { ConfirmTriageDto } from './dto/case-triage.dto';

@Controller('cases/:caseId/triage-spine')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseTriageController {
  constructor(private triage: CaseTriageService) {}

  @Get('current')
  @CaseAccess('view')
  async current(@Param('caseId') caseId: string) {
    return this.triage.getCurrent(caseId);
  }

  @Get('candidates')
  @CaseAccess('view')
  async candidates(@Param('caseId') caseId: string) {
    return this.triage.getCandidates(caseId);
  }

  @Post('confirm')
  @CaseAccess('edit')
  async confirm(
    @Param('caseId') caseId: string,
    @Body() dto: ConfirmTriageDto,
    @Req() req: any,
  ) {
    return this.triage.confirm(caseId, req.user.id, dto);
  }
}
