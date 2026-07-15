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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { FacilitiesService } from './facilities.service';
import {
  CreateFacilityDto,
  OnboardNurseryDto,
  UpdateFacilityDto,
  CreateRoomDto,
  UpdateRoomDto,
  AddFacilityMemberDto,
  UpdateFacilityMemberDto,
} from './dto/facilities.dto';

/**
 * Facilities — the write side of the tenancy model.
 *
 * AUTHORITY COMES FROM MEMBERSHIP, NOT FROM `User.role`. The role guard below is a
 * coarse outer filter on who may CREATE a facility at all; every other endpoint is
 * authorised by `assertFacilityMember` against the facility being addressed. A
 * platform role says what kind of person you are; it must never say which nursery's
 * children you can see.
 */
@ApiTags('facilities')
@Controller('facilities')
@UseGuards(JwtAuthGuard)
export class FacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.EDUCATOR, Role.ORGANIZATION, Role.THERAPIST, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Create a facility (NURSERY or SCHOOL)' })
  create(@Req() req: any, @Body() dto: CreateFacilityDto) {
    return this.facilities.create(req.user, dto);
  }

  @Post('onboard')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Platform admin: onboard a nursery (org + first site + admin) in one step' })
  onboard(@Req() req: any, @Body() dto: OnboardNurseryDto) {
    return this.facilities.onboardNursery(req.user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Facilities you staff' })
  list(@Req() req: any) {
    return this.facilities.list(req.user);
  }

  @Get(':facilityId')
  detail(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.facilities.detail(req.user, facilityId);
  }

  @Patch(':facilityId')
  update(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilities.update(req.user, facilityId, dto);
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────

  @Get(':facilityId/rooms')
  listRooms(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.facilities.listRooms(req.user, facilityId);
  }

  @Post(':facilityId/rooms')
  createRoom(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.facilities.createRoom(req.user, facilityId, dto);
  }

  @Patch(':facilityId/rooms/:roomId')
  updateRoom(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.facilities.updateRoom(req.user, facilityId, roomId, dto);
  }

  @Delete(':facilityId/rooms/:roomId')
  deleteRoom(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.facilities.deleteRoom(req.user, facilityId, roomId);
  }

  // ─── Staff ────────────────────────────────────────────────────────────────

  @Get(':facilityId/members')
  listMembers(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.facilities.listMembers(req.user, facilityId);
  }

  @Post(':facilityId/members')
  addMember(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Body() dto: AddFacilityMemberDto,
  ) {
    return this.facilities.addMember(req.user, facilityId, dto);
  }

  @Patch(':facilityId/members/:memberId')
  updateMember(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateFacilityMemberDto,
  ) {
    return this.facilities.updateMember(req.user, facilityId, memberId, dto);
  }

  @Delete(':facilityId/members/:memberId')
  removeMember(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.facilities.removeMember(req.user, facilityId, memberId);
  }
}
