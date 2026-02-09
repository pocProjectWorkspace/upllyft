import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseBillingService } from './case-billing.service';
import {
  CreateCaseBillingDto,
  UpdateCaseBillingDto,
  ListBillingQueryDto,
} from './dto/case-billing.dto';

@Controller('cases/:caseId/billing')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseBillingController {
  constructor(private billingService: CaseBillingService) {}

  @Post()
  @CaseAccess('manage')
  async createBillingRecord(
    @Param('caseId') caseId: string,
    @Body() dto: CreateCaseBillingDto,
    @Req() req: any,
  ) {
    return this.billingService.createBillingRecord(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listBillingRecords(
    @Param('caseId') caseId: string,
    @Query() query: ListBillingQueryDto,
  ) {
    return this.billingService.listBillingRecords(caseId, query);
  }

  @Patch(':billingId')
  @CaseAccess('manage')
  async updateBillingRecord(
    @Param('caseId') caseId: string,
    @Param('billingId') billingId: string,
    @Body() dto: UpdateCaseBillingDto,
    @Req() req: any,
  ) {
    return this.billingService.updateBillingRecord(caseId, billingId, req.user.id, dto);
  }
}
