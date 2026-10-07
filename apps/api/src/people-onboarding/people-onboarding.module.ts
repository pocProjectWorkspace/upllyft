import { Module } from '@nestjs/common';
import { AdminOnboardingController, OrgOnboardingController, PublicInvitationController } from './people-onboarding.controller';
import { OnboardingScopeService } from './onboarding-scope';
import { ParentInvitationService } from './parent-invitation.service';
import { TherapistOnboardingService } from './therapist-onboarding.service';

/** Bulk / single therapist onboarding and family invitations (platform + organisation). */
@Module({
  controllers: [AdminOnboardingController, OrgOnboardingController, PublicInvitationController],
  providers: [OnboardingScopeService, TherapistOnboardingService, ParentInvitationService],
  exports: [ParentInvitationService],
})
export class PeopleOnboardingModule {}
