import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IncidentService } from './incident.service';
import { ExternalShareService } from './external-share.service';
import { DischargeService } from './discharge.service';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  CloseIncidentDto,
  CreateExternalShareDto,
  DischargeCaseDto,
} from './dto/safety.dto';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentController {
  constructor(private incidents: IncidentService) {}

  @Get()
  list(
    @Query('caseId') caseId?: string,
    @Query('status') status?: IncidentStatus,
    @Query('openOnly') openOnly?: string,
  ) {
    return this.incidents.list({ caseId, status, openOnly: openOnly === 'true' });
  }

  @Post()
  create(@Body() dto: CreateIncidentDto, @Req() req: any) {
    return this.incidents.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidents.update(id, dto);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseIncidentDto, @Req() req: any) {
    return this.incidents.close(id, req.user.id, dto);
  }
}

@Controller('external-shares')
@UseGuards(JwtAuthGuard)
export class ExternalShareController {
  constructor(private shares: ExternalShareService) {}

  @Get()
  list(@Query('caseId') caseId: string) {
    return this.shares.list(caseId);
  }

  @Post()
  create(@Body() dto: CreateExternalShareDto, @Req() req: any) {
    return this.shares.create(req.user.id, dto);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.shares.revoke(id);
  }

  @Get('access/:token')
  access(@Param('token') token: string) {
    return this.shares.access(token);
  }
}

@Controller('cases/:caseId/discharge')
@UseGuards(JwtAuthGuard)
export class DischargeController {
  constructor(private discharge: DischargeService) {}

  @Post()
  dischargeCase(@Param('caseId') caseId: string, @Body() dto: DischargeCaseDto, @Req() req: any) {
    return this.discharge.discharge(caseId, req.user.id, dto);
  }

  @Post('archive')
  archive(@Param('caseId') caseId: string) {
    return this.discharge.archive(caseId);
  }

  @Post('reactivate')
  reactivate(@Param('caseId') caseId: string) {
    return this.discharge.reactivate(caseId);
  }
}
