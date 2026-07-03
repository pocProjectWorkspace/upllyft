import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicalTemplatesService } from './clinical-templates.service';
import { TherapyDiscipline, ClinicalActivityType } from '@prisma/client';

/**
 * Read-only catalog of clinical templates (the digitized clinic forms).
 * Therapists browse these to start a record; the picker uses /catalog.
 */
@Controller('clinical-templates')
@UseGuards(JwtAuthGuard)
export class ClinicalTemplatesController {
  constructor(private templatesService: ClinicalTemplatesService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('discipline') discipline?: TherapyDiscipline,
    @Query('activityType') activityType?: ClinicalActivityType,
  ) {
    return this.templatesService.list({
      discipline,
      activityType,
      organizationId: req.user?.organizationId ?? null,
    });
  }

  /** Discipline → available activity templates (drives the two-step picker). */
  @Get('catalog')
  async catalog(@Req() req: any) {
    return this.templatesService.getCatalog(req.user?.organizationId ?? null);
  }

  @Get('code/:code')
  async getByCode(@Param('code') code: string, @Req() req: any) {
    return this.templatesService.getByCode(code, req.user?.organizationId ?? null);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.templatesService.getById(id);
  }
}
