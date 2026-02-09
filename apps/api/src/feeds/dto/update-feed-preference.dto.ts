import { IsOptional, IsBoolean, IsString, IsArray, IsNumber, IsObject, IsEnum } from 'class-validator';
import { FeedView, FeedDensity } from '@prisma/client';

export class UpdateFeedPreferenceDto {
  // Feed Preferences with proper enum types
  @IsOptional()
  @IsEnum(FeedView)
  defaultFeedView?: FeedView;

  @IsOptional()
  @IsEnum(FeedDensity)
  feedDensity?: FeedDensity;

  @IsOptional()
  @IsBoolean()
  showAnonymousPosts?: boolean;

  @IsOptional()
  @IsBoolean()
  autoplayVideos?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedAuthors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  @IsOptional()
  @IsNumber()
  recencyWeight?: number;

  @IsOptional()
  @IsNumber()
  relevanceWeight?: number;

  @IsOptional()
  @IsNumber()
  engagementWeight?: number;

  // Crisis Settings
  @IsOptional()
  @IsBoolean()
  crisisModuleEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  showSOSButton?: boolean;

  @IsOptional()
  @IsBoolean()
  crisisAutoDetection?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emergencyContacts?: string[];

  @IsOptional()
  @IsObject()
  savedCrisisResources?: any;

  // Notification Settings
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailDigestFrequency?: string;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppSoundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsObject()
  notificationPrefs?: any;

  // Privacy Settings
  @IsOptional()
  @IsBoolean()
  profilePublic?: boolean;

  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDirectMessages?: boolean;
}