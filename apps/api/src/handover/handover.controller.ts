import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HandoverService } from './handover.service';
import { GenerateHandoverDto, UpdateHandoverDto } from './dto/handover.dto';

/** Staff-facing handover records (F11). Every method re-checks the gate in the service. */
@ApiTags('handover')
@Controller('facilities/:facilityId/children/:childId/handovers')
@UseGuards(JwtAuthGuard)
export class HandoverController {
  constructor(private readonly handover: HandoverService) {}

  @Get()
  @ApiOperation({ summary: 'Handover records for this child (staff view)' })
  list(@Req() req: any, @Param('facilityId') facilityId: string, @Param('childId') childId: string) {
    return this.handover.listForFacility(req.user, facilityId, childId);
  }

  @Post()
  @ApiOperation({ summary: "Assemble a handover from the child's identification + support story" })
  generate(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Body() dto: GenerateHandoverDto,
  ) {
    return this.handover.generate(req.user, facilityId, childId, dto);
  }

  @Patch(':handoverId')
  @ApiOperation({ summary: 'Edit the handover before it is shared' })
  update(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('handoverId') handoverId: string,
    @Body() dto: UpdateHandoverDto,
  ) {
    return this.handover.update(req.user, facilityId, handoverId, dto);
  }

  @Post(':handoverId/share')
  @ApiOperation({ summary: 'Disclose the handover onward (only after the guardian authorised it)' })
  share(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('handoverId') handoverId: string,
  ) {
    return this.handover.share(req.user, facilityId, handoverId);
  }
}

/** GUARDIAN-facing. The family sees handovers about their child and authorises the disclosure. */
@ApiTags('handover')
@Controller('children/:childId/handovers')
@UseGuards(JwtAuthGuard)
export class GuardianHandoverController {
  constructor(private readonly handover: HandoverService) {}

  @Get()
  @ApiOperation({ summary: 'Handover records a nursery has prepared about your child' })
  list(@Req() req: any, @Param('childId') childId: string) {
    return this.handover.listForGuardian(req.user, childId);
  }

  @Post(':handoverId/authorize')
  @ApiOperation({ summary: 'Authorise a handover to be disclosed onward' })
  authorize(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('handoverId') handoverId: string,
  ) {
    return this.handover.authorize(req.user, childId, handoverId);
  }
}
