
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsDateString, IsUrl, IsEmail, IsInt } from 'class-validator';
import { EventCategory, EventFormat } from '@prisma/client';

export class CreateEventDto {
  @IsOptional()
  @IsString()
  communityId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @IsEnum(EventCategory)
  eventType: EventCategory;  // Maps to eventType in schema ✅

  @IsEnum(EventFormat)
  format: EventFormat;  // Maps to format in schema ✅

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  timezone?: string = 'Asia/Kolkata';

  // Location fields (for in-person/hybrid) ✅
  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  location?: string;  // For backward compatibility ✅

  // Virtual fields (for virtual/hybrid) ✅
  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @IsOptional()
  @IsUrl()
  virtualLink?: string;  // For backward compatibility ✅

  @IsOptional()
  @IsString()
  platform?: string;

  // Special needs specific ✅
  @IsArray()
  @IsString({ each: true })
  ageGroup: string[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibilityFeatures?: string[] = [];

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  // Contact information ✅
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactWhatsApp?: string;

  @IsOptional()
  @IsUrl()
  externalLink?: string;

  // Visibility ✅
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @IsOptional()
  @IsBoolean()
  shareToFeed?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  // WhatsApp Integration ✅
  @IsOptional()
  @IsBoolean()
  whatsappReminderEnabled?: boolean = false;

  @IsOptional()
  @IsString()
  whatsappGroupId?: string;

  // Attendance (for future use) ✅
  @IsOptional()
  @IsInt()
  maxAttendees?: number;

  // Status fields (usually not in create, but in update)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;  // For backward compatibility ✅
}