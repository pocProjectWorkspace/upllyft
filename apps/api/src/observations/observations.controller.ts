import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObservationsService } from './observations.service';
import { CreateObservationDto, ListObservationsQueryDto } from './dto/observations.dto';

/**
 * Staff-facing observations, scoped to a facility + child. Every method re-checks the
 * consent gate in the service — there is no facility role that grants access on its own.
 */
@ApiTags('observations')
@Controller('facilities/:facilityId/children/:childId/observations')
@UseGuards(JwtAuthGuard)
export class ObservationsController {
  constructor(private readonly observations: ObservationsService) {}

  @Get()
  @ApiOperation({ summary: 'The observation timeline for a child at this facility' })
  list(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Query() query: ListObservationsQueryDto,
  ) {
    return this.observations.listForFacility(req.user, facilityId, childId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Record an observation (requires an active, consented enrolment)' })
  create(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Body() dto: CreateObservationDto,
  ) {
    return this.observations.create(req.user, facilityId, childId, dto);
  }

  @Delete(':observationId')
  @ApiOperation({ summary: 'Remove an observation (author, or a facility admin)' })
  remove(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('observationId') observationId: string,
  ) {
    return this.observations.remove(req.user, facilityId, observationId);
  }
}

/**
 * GUARDIAN-facing: what has been recorded about MY child, across every setting. Authorised
 * on the guardian relationship, not the facility gate.
 */
@ApiTags('observations')
@Controller('children/:childId/observations')
@UseGuards(JwtAuthGuard)
export class GuardianObservationsController {
  constructor(private readonly observations: ObservationsService) {}

  @Get()
  @ApiOperation({ summary: "A guardian's view of everything recorded about their child" })
  list(
    @Req() req: any,
    @Param('childId') childId: string,
    @Query() query: ListObservationsQueryDto,
  ) {
    return this.observations.listForGuardian(req.user, childId, query);
  }
}
