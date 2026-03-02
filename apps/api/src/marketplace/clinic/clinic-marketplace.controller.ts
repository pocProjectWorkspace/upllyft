import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicMarketplaceService } from './clinic-marketplace.service';

@Controller('marketplace/clinics')
@UseGuards(JwtAuthGuard)
export class ClinicMarketplaceController {
  constructor(
    private readonly clinicMarketplaceService: ClinicMarketplaceService,
  ) {}

  @Get()
  async searchClinics(
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('country') country?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.clinicMarketplaceService.searchClinics({
      search,
      specialization,
      country,
      page: +page,
      limit: +limit,
    });
  }

  @Get(':id')
  async getClinicDetail(@Param('id') clinicId: string) {
    return this.clinicMarketplaceService.getClinicWithTherapists(clinicId);
  }
}
