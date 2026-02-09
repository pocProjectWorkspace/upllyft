// apps/api/src/communities/dto/community.dto.ts
import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsEnum } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type: string; // condition-based, location-based, professional, age-based

  @IsString()
  @IsOptional()
  condition?: string; // autism, adhd, down-syndrome, etc.

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  ageRange?: number[];

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsBoolean()
  @IsOptional()
  inviteOnly?: boolean;

  @IsString()
  @IsOptional()
  rules?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  whatsappEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  autoCreateWhatsAppGroup?: boolean;

  @IsInt()
  @IsOptional()
  whatsappGroupLimit?: number;

  @IsString()
  @IsOptional()
  primaryLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedLanguages?: string[];
}

export class UpdateCommunityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  rules?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  whatsappEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}