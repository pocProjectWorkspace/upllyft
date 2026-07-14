import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NurseryService } from './nursery.service';
import { AddRosterChildDto, UpdateRosterPlacementDto } from './dto/nursery.dto';

/**
 * The nursery roster.
 *
 * Every endpoint authorises through `assertFacilityMember` against the facility in
 * the path — there is no platform role that grants access to a nursery's children.
 */
@ApiTags('nursery')
@Controller('facilities/:facilityId/roster')
@UseGuards(JwtAuthGuard)
export class NurseryController {
  constructor(private readonly nursery: NurseryService) {}

  @Get()
  @ApiOperation({ summary: 'The roster — names and consent status, not records' })
  roster(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.nursery.roster(req.user, facilityId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a child and invite their guardian to claim them' })
  addChild(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Body() dto: AddRosterChildDto,
  ) {
    return this.nursery.addChild(req.user, facilityId, dto);
  }

  @Patch(':affiliationId')
  @ApiOperation({ summary: 'Move a child between rooms, or reassign their keyworker' })
  updatePlacement(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('affiliationId') affiliationId: string,
    @Body() dto: UpdateRosterPlacementDto,
  ) {
    return this.nursery.updatePlacement(req.user, facilityId, affiliationId, dto);
  }

  @Post(':affiliationId/resend-claim')
  @ApiOperation({ summary: 'Re-send the guardian claim link (rotates the token)' })
  resendClaim(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('affiliationId') affiliationId: string,
  ) {
    return this.nursery.resendClaim(req.user, facilityId, affiliationId);
  }

  @Delete(':affiliationId')
  @ApiOperation({ summary: 'The child has left — end the enrolment (does not delete the child)' })
  endEnrolment(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('affiliationId') affiliationId: string,
  ) {
    return this.nursery.endEnrolment(req.user, facilityId, affiliationId);
  }
}
