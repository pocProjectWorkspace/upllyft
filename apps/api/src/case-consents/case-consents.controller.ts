import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseConsentsService } from './case-consents.service';
import { CreateCaseConsentDto, ListConsentsQueryDto } from './dto/case-consents.dto';

@Controller('cases/:caseId/consents')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseConsentsController {
  constructor(private consentsService: CaseConsentsService) {}

  @Post()
  @CaseAccess('view') // Parents can also grant consent
  async createConsent(
    @Param('caseId') caseId: string,
    @Body() dto: CreateCaseConsentDto,
    @Req() req: any,
  ) {
    return this.consentsService.createConsent(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listConsents(
    @Param('caseId') caseId: string,
    @Query() query: ListConsentsQueryDto,
  ) {
    return this.consentsService.listConsents(caseId, query);
  }

  @Post(':consentId/revoke')
  @CaseAccess('view') // The person who granted can revoke
  async revokeConsent(
    @Param('caseId') caseId: string,
    @Param('consentId') consentId: string,
    @Req() req: any,
  ) {
    return this.consentsService.revokeConsent(caseId, consentId, req.user.id);
  }

  @Get('compliance')
  @CaseAccess('view')
  async getComplianceStatus(@Param('caseId') caseId: string) {
    return this.consentsService.getComplianceStatus(caseId);
  }
}
