// apps/api/src/user/dto/user-preferences.dto.ts
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationTypesDto {
  @IsBoolean()
  comments: boolean;

  @IsBoolean()
  replies: boolean;

  @IsBoolean()
  mentions: boolean;

  @IsBoolean()
  follows: boolean;

  @IsBoolean()
  resources: boolean;
}

class EmergencyContactDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  relationship: string;
}

export class UserPreferencesDto {
  // Feed preferences
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  followedCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  followedTags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedTags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contentTypes?: string[];

  @IsBoolean()
  @IsOptional()
  verifiedAuthorsOnly?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minEngagement?: number;

  // Notification preferences
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @IsEnum(['instant', 'daily', 'weekly', 'never'])
  @IsOptional()
  notificationFrequency?: string;

  @ValidateNested()
  @Type(() => NotificationTypesDto)
  @IsOptional()
  notificationTypes?: NotificationTypesDto;

  // Crisis preferences
  @IsBoolean()
  @IsOptional()
  showCrisisButton?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContacts?: EmergencyContactDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredHelplines?: string[];
}