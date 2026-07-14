import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicTherapistsService } from './clinic-therapists.service';
import { resolveClinicScope } from '../common/tenant-scope';
import {
  ListTherapistsQueryDto,
  TherapistScheduleQueryDto,
  UpdateCredentialsDto,
} from './dto/clinic-therapists.dto';

/**
 * The clinic's therapist directory. EVERY method is facility-scoped: this module
 * previously filtered on `isActive` and nothing else, so any clinic admin saw every
 * therapist on the platform — and could edit their credentials.
 */
@Controller('admin/therapists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicTherapistsController {
  constructor(
    private readonly clinicTherapistsService: ClinicTherapistsService,
  ) {}

  @Get()
  async listTherapists(@Query() query: ListTherapistsQueryDto, @Req() req: any) {
    return this.clinicTherapistsService.listTherapists(query, resolveClinicScope(req.user));
  }

  @Get('schedule')
  async getConsolidatedSchedule(@Query() query: TherapistScheduleQueryDto, @Req() req: any) {
    return this.clinicTherapistsService.getConsolidatedSchedule(
      query,
      resolveClinicScope(req.user),
    );
  }

  @Get(':id')
  async getTherapistDetail(@Param('id') id: string, @Req() req: any) {
    return this.clinicTherapistsService.getTherapistDetail(id, resolveClinicScope(req.user));
  }

  @Get(':id/schedule')
  async getTherapistSchedule(
    @Param('id') id: string,
    @Query() query: TherapistScheduleQueryDto,
    @Req() req: any,
  ) {
    return this.clinicTherapistsService.getTherapistSchedule(
      id,
      query,
      resolveClinicScope(req.user),
    );
  }

  /** Verifying a licence is how a therapist becomes assignable. Own facility only. */
  @Patch(':id/credentials')
  @Roles(Role.ADMIN)
  async updateCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialsDto,
    @Req() req: any,
  ) {
    return this.clinicTherapistsService.updateCredentials(
      id,
      dto,
      resolveClinicScope(req.user),
    );
  }
}
