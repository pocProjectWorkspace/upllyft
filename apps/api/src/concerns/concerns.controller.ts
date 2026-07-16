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
import { ConcernsService } from './concerns.service';
import { RaiseConcernDto, UpdateConcernDto, AcknowledgeConcernDto } from './dto/concerns.dto';

/**
 * Staff-facing concerns. Includes the PRIVATE coaching. Every method re-checks the raise
 * gate (inclusion role + capability + consent) in the service.
 */
@ApiTags('concerns')
@Controller('facilities/:facilityId/children/:childId/concerns')
@UseGuards(JwtAuthGuard)
export class ConcernsController {
  constructor(private readonly concerns: ConcernsService) {}

  @Get()
  @ApiOperation({ summary: 'Concerns for this child at this nursery (staff view)' })
  list(@Req() req: any, @Param('facilityId') facilityId: string, @Param('childId') childId: string) {
    return this.concerns.listForFacility(req.user, facilityId, childId);
  }

  @Post()
  @ApiOperation({ summary: 'Raise a concern — gathers evidence and generates coaching + a draft' })
  raise(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Body() dto: RaiseConcernDto,
  ) {
    return this.concerns.raise(req.user, facilityId, childId, dto);
  }

  @Patch(':concernId')
  @ApiOperation({ summary: 'Edit the parent-facing summary before sharing' })
  update(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('concernId') concernId: string,
    @Body() dto: UpdateConcernDto,
  ) {
    return this.concerns.updateSummary(req.user, facilityId, concernId, dto);
  }

  @Post(':concernId/share')
  @ApiOperation({ summary: 'Share the concern with the guardian' })
  share(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('concernId') concernId: string,
  ) {
    return this.concerns.share(req.user, facilityId, concernId);
  }
}

/**
 * GUARDIAN-facing. Only SHARED concerns, never the private staff coaching.
 */
@ApiTags('concerns')
@Controller('children/:childId/concerns')
@UseGuards(JwtAuthGuard)
export class GuardianConcernsController {
  constructor(private readonly concerns: ConcernsService) {}

  @Get()
  @ApiOperation({ summary: "Concerns a nursery has shared about your child" })
  list(@Req() req: any, @Param('childId') childId: string) {
    return this.concerns.listForGuardian(req.user, childId);
  }

  @Post(':concernId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a shared concern (optionally with a response)' })
  acknowledge(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('concernId') concernId: string,
    @Body() dto: AcknowledgeConcernDto,
  ) {
    return this.concerns.acknowledge(req.user, childId, concernId, dto);
  }
}
