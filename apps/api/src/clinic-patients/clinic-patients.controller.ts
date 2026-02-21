import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
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
} from './dto/clinic-patients.dto';

@Controller('admin/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicPatientsController {
  constructor(private readonly clinicPatientsService: ClinicPatientsService) {}

  @Get()
  async listPatients(@Query() query: ListPatientsQueryDto) {
    return this.clinicPatientsService.listPatients(query);
  }

  @Get('therapists')
  async getTherapistsList() {
    return this.clinicPatientsService.getTherapistsList();
  }

  @Get(':childId')
  async getPatientDetail(@Param('childId') childId: string) {
    return this.clinicPatientsService.getPatientDetail(childId);
  }

  @Patch(':childId')
  async updatePatientStatus(
    @Param('childId') childId: string,
    @Body() dto: UpdatePatientStatusDto,
  ) {
    return this.clinicPatientsService.updatePatientStatus(childId, dto);
  }

  @Post(':childId/assign')
  async assignTherapist(
    @Param('childId') childId: string,
    @Body() dto: AssignTherapistDto,
  ) {
    return this.clinicPatientsService.assignTherapist(childId, dto);
  }
}
