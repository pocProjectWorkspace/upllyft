// apps/api/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DeviceType } from '../../fcm-token/dto';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'LIC123456' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: ['Psychology', 'Counseling'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialization?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 'Mental Health Org' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({ example: 'Licensed therapist with 5 years of experience' })
  @IsOptional()
  @IsString()
  bio?: string;

  // Sign-up checkboxes: the version of each document the user ticked. Optional so
  // older app builds can still register; they meet the in-app acceptance gate instead.
  @ApiPropertyOptional({ example: '2026-10-19', description: 'Terms of Service version accepted' })
  @IsOptional()
  @IsString()
  acceptedTermsVersion?: string;

  @ApiPropertyOptional({ example: '2026-10-19', description: 'Privacy Policy version acknowledged' })
  @IsOptional()
  @IsString()
  acceptedPrivacyVersion?: string;

  @ApiPropertyOptional({ example: '1', description: 'Age (18+) confirmation version' })
  @IsOptional()
  @IsString()
  confirmedAgeVersion?: string;

  @ApiProperty({ example: 'ABC123', description: 'Captcha verification code (the user-typed answer)' })
  @IsString()
  captcha: string;

  @ApiPropertyOptional({
    description:
      'Signed JWT captcha token returned by /auth/captcha/generate. ' +
      'When provided, the server verifies the user-typed captcha against this ' +
      'token instead of relying on a session cookie. This makes registration ' +
      'work reliably across multi-replica deployments and avoids cookie races.',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;

  @ApiPropertyOptional({ description: 'Token from a family invitation link (informational — invitations are matched by email).' })
  @IsOptional()
  @IsString()
  inviteToken?: string;

  @ApiPropertyOptional({
    example: 'dAPZpk2bRl2XXXXXXXXXXXXXX:APA91bGXXXXXXXXXX...',
    description: 'Firebase Cloud Messaging token for push notifications'
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({
    enum: () => DeviceType,
    enumName: 'DeviceType',
    example: DeviceType.WEB,
    description: 'Device type (web, ios, android, browser)'
  })
  @IsEnum(DeviceType)
  @IsOptional()
  device?: DeviceType;
}
