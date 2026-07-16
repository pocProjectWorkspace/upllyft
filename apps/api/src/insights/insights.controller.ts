import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

/** Setting-level early-identification insights (F10). Facility leadership only. */
@ApiTags('insights')
@Controller('facilities/:facilityId/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  @ApiOperation({ summary: 'Setting-level early-identification insights, including equity' })
  facility(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.insights.facilityInsights(req.user, facilityId);
  }
}
