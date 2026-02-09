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

  @ApiProperty({ example: 'ABC123', description: 'Captcha verification code' })
  @IsString()
  captcha: string;

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
