import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingSettingsDto } from './dto/update-onboarding-settings.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@ApiTags('Onboarding')
@Controller()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ── Admin endpoints ──────────────────────────────────────────────

  @Get('admin/onboarding/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get onboarding settings (admin only)' })
  async getSettings() {
    return this.onboardingService.getOnboardingSettings();
  }

  @Put('admin/onboarding/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update onboarding settings (admin only)' })
  async updateSettings(@Body() dto: UpdateOnboardingSettingsDto) {
    return this.onboardingService.updateOnboardingSettings(dto);
  }

  // ── User-facing endpoints ────────────────────────────────────────

  @Get('onboarding/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if onboarding should show for current user' })
  async checkOnboarding(@Request() req: any) {
    return this.onboardingService.checkOnboarding(req.user.role);
  }

  @Get('onboarding/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get onboarding status for current user (enabled, completed, data)',
  })
  async getOnboardingStatus(@Request() req: any) {
    return this.onboardingService.getOnboardingStatus(
      req.user.id,
      req.user.role,
    );
  }

  @Post('onboarding/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Complete onboarding: save responses, create child, compute recommendation',
  })
  async completeOnboarding(
    @Request() req: any,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.onboardingService.completeOnboarding(req.user.id, dto);
  }
}
