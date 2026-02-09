import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnboardingSettingsDto {
  @ApiPropertyOptional({ description: 'Enable onboarding for parent/user role' })
  @IsBoolean()
  @IsOptional()
  parentOnboardingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable onboarding for therapist/educator role' })
  @IsBoolean()
  @IsOptional()
  therapistOnboardingEnabled?: boolean;
}
