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
  @Roles(Role.ADMIN)
  async createWalkinPatient(@Body() dto: CreateWalkinPatientDto, @Req() req: any) {
    return this.clinicPatientsService.createWalkinPatient(dto, req.user.id, req.user.clinicId);
  }

  @Get()
  async listPatients(@Query() query: ListPatientsQueryDto, @Req() req: any) {
    return this.clinicPatientsService.listPatients(query, req.user.clinicId);
  }

  @Get('therapists')
  async getTherapistsList(@Req() req: any) {
    return this.clinicPatientsService.getTherapistsList(req.user.clinicId);
  }

  @Get(':childId')
  async getPatientDetail(@Param('childId') childId: string, @Req() req: any) {
    return this.clinicPatientsService.getPatientDetail(childId, req.user.clinicId);
  }

  @Patch(':childId')
  async updatePatientStatus(
    @Param('childId') childId: string,
    @Body() dto: UpdatePatientStatusDto,
    @Req() req: any,
  ) {
    return this.clinicPatientsService.updatePatientStatus(childId, dto, req.user.clinicId);
  }

  @Post(':childId/assign')
  @Roles(Role.ADMIN)
  async assignTherapist(
    @Param('childId') childId: string,
    @Body() dto: AssignTherapistDto,
    @Req() req: any,
  ) {
    return this.clinicPatientsService.assignTherapist(childId, dto, req.user.clinicId);
  }
}
