import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseEscalationService } from './case-escalation.service';
import {
  CreateEscalationDto,
  UpdateEscalationDto,
  FollowUpDto,
} from './dto/case-escalation.dto';

@Controller('cases/:caseId/escalations')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseEscalationController {
  constructor(private escalation: CaseEscalationService) {}

  @Get()
  @CaseAccess('view')
  list(@Param('caseId') caseId: string) {
    return this.escalation.list(caseId);
  }

  @Get(':id')
  @CaseAccess('view')
  get(@Param('caseId') caseId: string, @Param('id') id: string) {
    return this.escalation.get(caseId, id);
  }

  @Post()
  @CaseAccess('edit')
  create(@Param('caseId') caseId: string, @Body() dto: CreateEscalationDto, @Req() req: any) {
    return this.escalation.create(caseId, req.user.id, dto);
  }

  @Patch(':id')
  @CaseAccess('edit')
  update(@Param('caseId') caseId: string, @Param('id') id: string, @Body() dto: UpdateEscalationDto) {
    return this.escalation.update(caseId, id, dto);
  }

  @Post(':id/send')
  @CaseAccess('edit')
  send(@Param('caseId') caseId: string, @Param('id') id: string, @Req() req: any) {
    return this.escalation.send(caseId, req.user.id, id);
  }

  @Post(':id/follow-up')
  @CaseAccess('edit')
  followUp(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @Body() dto: FollowUpDto,
    @Req() req: any,
  ) {
    return this.escalation.followUp(caseId, req.user.id, id, dto);
  }
}
