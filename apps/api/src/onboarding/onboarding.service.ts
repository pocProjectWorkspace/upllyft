import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateOnboardingSettingsDto } from './dto/update-onboarding-settings.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOnboardingSettings() {
    const settings = await this.getOrCreateSettings();
    return {
      parentOnboardingEnabled: settings.parentOnboardingEnabled,
      therapistOnboardingEnabled: settings.therapistOnboardingEnabled,
    };
  }

  async updateOnboardingSettings(dto: UpdateOnboardingSettingsDto) {
    const settings = await this.getOrCreateSettings();
    return this.prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.parentOnboardingEnabled !== undefined && {
          parentOnboardingEnabled: dto.parentOnboardingEnabled,
        }),
        ...(dto.therapistOnboardingEnabled !== undefined && {
          therapistOnboardingEnabled: dto.therapistOnboardingEnabled,
        }),
      },
      select: {
        parentOnboardingEnabled: true,
        therapistOnboardingEnabled: true,
      },
    });
  }

  async checkOnboarding(userRole: Role): Promise<{ showOnboarding: boolean; flow: 'parent' | 'therapist' | null }> {
    const settings = await this.getOrCreateSettings();

    if (userRole === Role.USER) {
      return {
        showOnboarding: settings.parentOnboardingEnabled,
        flow: settings.parentOnboardingEnabled ? 'parent' : null,
      };
    }

    if (userRole === Role.THERAPIST || userRole === Role.EDUCATOR) {
      return {
        showOnboarding: settings.therapistOnboardingEnabled,
        flow: settings.therapistOnboardingEnabled ? 'therapist' : null,
      };
    }

    return { showOnboarding: false, flow: null };
  }

  private async getOrCreateSettings() {
    const settings = await this.prisma.platformSettings.findFirst();
    if (settings) return settings;
    return this.prisma.platformSettings.create({ data: {} });
  }
}
