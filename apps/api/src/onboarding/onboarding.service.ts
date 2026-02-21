import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { UpdateOnboardingSettingsDto } from './dto/update-onboarding-settings.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { NotificationService, NotificationType } from '../notification/notification.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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

  async checkOnboarding(
    userRole: Role,
  ): Promise<{ showOnboarding: boolean; flow: 'parent' | 'therapist' | null }> {
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

  /**
   * GET /onboarding/status — returns whether onboarding is complete and enabled
   */
  async getOnboardingStatus(userId: string, userRole: Role) {
    const settings = await this.getOrCreateSettings();

    // Only parents (USER role) use the full onboarding questionnaire
    const onboardingEnabled =
      userRole === Role.USER
        ? settings.parentOnboardingEnabled
        : userRole === Role.THERAPIST || userRole === Role.EDUCATOR
          ? settings.therapistOnboardingEnabled
          : false;

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        onboardingCompleted: true,
        onboardingData: true,
      },
    });

    return {
      onboardingEnabled,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      onboardingData: profile?.onboardingData ?? null,
    };
  }

  /**
   * POST /onboarding/complete — saves responses, creates child if needed,
   * computes recommendation, and marks onboarding as complete
   */
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const recommendation = this.computeRecommendation(
      dto.primaryReason,
      dto.concerns,
    );

    const onboardingData = {
      primaryReason: dto.primaryReason,
      concerns: dto.concerns,
      childSnapshot: dto.child ?? null,
      recommendedNextStep: recommendation.recommendedNextStep,
      recommendedModule: recommendation.recommendedModule,
      recommendedReason: recommendation.recommendedReason,
      completedAt: new Date().toISOString(),
    };

    // Upsert user profile with onboarding data
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        onboardingCompleted: true,
        onboardingData: onboardingData as unknown as Prisma.InputJsonValue,
      },
      update: {
        onboardingCompleted: true,
        onboardingData: onboardingData as unknown as Prisma.InputJsonValue,
      },
    });

    // If child info was provided and user has no children yet, create one
    if (dto.child?.firstName && dto.child?.dateOfBirth) {
      const existingChildren = await this.prisma.child.count({
        where: { profileId: profile.id },
      });

      if (existingChildren === 0) {
        const newChild = await this.prisma.child.create({
          data: {
            profileId: profile.id,
            firstName: dto.child.firstName,
            dateOfBirth: new Date(dto.child.dateOfBirth),
            gender: dto.child.gender || 'Prefer not to say',
            hasCondition: dto.child.hasConditions ?? false,
          },
        });

        // If conditions were specified, add them
        if (
          dto.child.hasConditions &&
          dto.child.conditions &&
          dto.child.conditions.length > 0
        ) {
          await this.prisma.childCondition.createMany({
            data: dto.child.conditions.map((conditionType) => ({
              childId: newChild.id,
              conditionType,
            })),
          });
        }

        // Notify all admins about the new patient intake
        try {
          const parentUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          const admins = await this.prisma.user.findMany({
            where: { role: Role.ADMIN },
            select: { id: true },
          });
          const parentName = parentUser?.name || 'A parent';
          const childName = dto.child.firstName;

          await Promise.all(
            admins.map((admin) =>
              this.notificationService.createNotification({
                userId: admin.id,
                type: NotificationType.INTAKE_NEW,
                title: 'New Patient Intake',
                message: `New patient intake: ${childName}, registered by ${parentName}`,
                actionUrl: '/patients?status=INTAKE',
                relatedEntityId: newChild.id,
                relatedEntityType: 'child',
                priority: 'high',
              }),
            ),
          );
        } catch (error) {
          this.logger.error('Failed to send intake notifications:', error);
        }
      }
    }

    return {
      success: true,
      onboardingData,
    };
  }

  private computeRecommendation(
    primaryReason: string,
    concerns: string[],
  ): {
    recommendedNextStep: string;
    recommendedModule: string;
    recommendedReason: string;
  } {
    // Primary reason-based recommendations
    if (primaryReason === 'screen-development') {
      return {
        recommendedNextStep: 'screening',
        recommendedModule: 'Screening',
        recommendedReason:
          "Our quick developmental screening will help you understand where your child is thriving and where they might need extra support.",
      };
    }

    if (primaryReason === 'find-therapist') {
      return {
        recommendedNextStep: 'booking',
        recommendedModule: 'Find a Therapist',
        recommendedReason:
          "We'll connect you with verified professionals who specialize in your child's needs.",
      };
    }

    if (primaryReason === 'connect-parents') {
      return {
        recommendedNextStep: 'community',
        recommendedModule: 'Community',
        recommendedReason:
          "Join a supportive community of parents who understand what you're going through.",
      };
    }

    if (primaryReason === 'recent-diagnosis') {
      return {
        recommendedNextStep: 'screening',
        recommendedModule: 'Screening & Insights',
        recommendedReason:
          "After a diagnosis, understanding your child's unique profile is the best first step. Our screening tools will give you a clear picture.",
      };
    }

    // For "just-exploring" or fallback, look at concerns
    if (concerns.length > 0) {
      const hasDevelopmental = concerns.includes(
        'Understanding my child\'s development',
      );
      const hasSpeech = concerns.includes('Speech and communication');
      const hasMotor = concerns.includes(
        'Motor skills and physical development',
      );
      const hasSupport = concerns.includes(
        'Finding the right support and therapies',
      );
      const hasSocial = concerns.includes('Social skills and behavior');

      if (hasSupport) {
        return {
          recommendedNextStep: 'booking',
          recommendedModule: 'Find a Therapist',
          recommendedReason:
            "Finding the right therapist can make all the difference. Let's help you connect with a professional who fits your family's needs.",
        };
      }

      if (hasDevelopmental || hasSpeech || hasMotor) {
        return {
          recommendedNextStep: 'screening',
          recommendedModule: 'Screening',
          recommendedReason:
            "A developmental screening will help you understand exactly where your child stands and what support could help most.",
        };
      }

      if (hasSocial) {
        return {
          recommendedNextStep: 'screening',
          recommendedModule: 'Screening',
          recommendedReason:
            "Understanding your child's social development profile is a great first step toward finding the right strategies.",
        };
      }
    }

    // Default: recommend screening as a good starting point
    return {
      recommendedNextStep: 'screening',
      recommendedModule: 'Screening',
      recommendedReason:
        "A developmental screening is a great starting point. It'll help us understand your child's needs and guide your next steps.",
    };
  }

  private async getOrCreateSettings() {
    const settings = await this.prisma.platformSettings.findFirst();
    if (settings) return settings;
    return this.prisma.platformSettings.create({ data: {} });
  }
}
