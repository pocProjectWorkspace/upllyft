import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicPatientsService } from './clinic-patients.service';
import { resolveClinicScope } from '../common/tenant-scope';
import {
  ListPatientsQueryDto,
  UpdatePatientStatusDto,
  AssignTherapistDto,
  CreateWalkinPatientDto,
} from './dto/clinic-patients.dto';

@Controller('admin/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicPatientsController {
  constructor(private readonly clinicPatientsService: ClinicPatientsService) { }

  @Post()
  @Roles(Role.ADMIN, Role.THERAPIST)
  async createWalkinPatient(@Body() dto: CreateWalkinPatientDto, @Req() req: any) {
    return this.clinicPatientsService.createWalkinPatient(dto, req.user.id, resolveClinicScope(req.user));
  }

  @Get()
  async listPatients(@Query() query: ListPatientsQueryDto, @Req() req: any) {
    return this.clinicPatientsService.listPatients(query, resolveClinicScope(req.user));
  }

  @Get('therapists')
  async getTherapistsList(@Req() req: any) {
    return this.clinicPatientsService.getTherapistsList(resolveClinicScope(req.user));
  }

  @Get(':childId')
  async getPatientDetail(@Param('childId') childId: string, @Req() req: any) {
    return this.clinicPatientsService.getPatientDetail(childId, resolveClinicScope(req.user));
  }

  @Patch(':childId')
  async updatePatientStatus(
    @Param('childId') childId: string,
    @Body() dto: UpdatePatientStatusDto,
    @Req() req: any,
  ) {
    return this.clinicPatientsService.updatePatientStatus(childId, dto, resolveClinicScope(req.user));
  }

  @Post(':childId/assign')
  @Roles(Role.ADMIN, Role.THERAPIST)
  async assignTherapist(
    @Param('childId') childId: string,
    @Body() dto: AssignTherapistDto,
    @Req() req: any,
  ) {
    return this.clinicPatientsService.assignTherapist(childId, dto, resolveClinicScope(req.user));
  }
}
