import { Controller, Get, Put, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseIntakeService } from './case-intake.service';
import { SaveCaseIntakeDto } from './dto/case-intake.dto';

@Controller('cases/:caseId/intake')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseIntakeController {
  constructor(private intake: CaseIntakeService) {}

  @Get()
  @CaseAccess('view')
  async get(@Param('caseId') caseId: string) {
    return this.intake.getIntake(caseId);
  }

  @Put('draft')
  @CaseAccess('edit')
  async saveDraft(
    @Param('caseId') caseId: string,
    @Body() dto: SaveCaseIntakeDto,
    @Req() req: any,
  ) {
    return this.intake.saveDraft(caseId, req.user.id, dto);
  }

  @Post('summarise')
  @CaseAccess('edit')
  async summarise(
    @Param('caseId') caseId: string,
    @Body() dto: SaveCaseIntakeDto,
    @Req() req: any,
  ) {
    return this.intake.summarise(caseId, req.user.id, dto);
  }
}
