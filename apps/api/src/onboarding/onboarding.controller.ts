import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingSettingsDto } from './dto/update-onboarding-settings.dto';

@ApiTags('Onboarding')
@Controller()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

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

  @Get('onboarding/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if onboarding should show for current user' })
  async checkOnboarding(@Request() req: any) {
    return this.onboardingService.checkOnboarding(req.user.role);
  }
}
