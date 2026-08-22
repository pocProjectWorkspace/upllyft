import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicMarketplaceService } from './clinic-marketplace.service';
import { MatchingService } from '../matching/matching.service';

@Controller('marketplace/clinics')
@UseGuards(JwtAuthGuard)
export class ClinicMarketplaceController {
  constructor(
    private readonly clinicMarketplaceService: ClinicMarketplaceService,
    private readonly matchingService: MatchingService,
  ) {}

  @Get()
  async searchClinics(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('country') country?: string,
    @Query('childId') childId?: string,
    @Query('concern') concern?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const needs = await this.matchingService.resolveNeeds(req.user, childId, concern);
    return this.clinicMarketplaceService.searchClinics(
      {
        search,
        specialization,
        country,
        page: +page,
        limit: +limit,
      },
      needs,
    );
  }

  @Get(':id')
  async getClinicDetail(@Param('id') clinicId: string) {
    return this.clinicMarketplaceService.getClinicWithTherapists(clinicId);
  }
}
