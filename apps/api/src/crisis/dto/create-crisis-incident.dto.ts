import { IsEnum, IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';

// Define enums locally to avoid import issues
export enum CrisisType {
  SUICIDE_RISK = 'SUICIDE_RISK',
  SELF_HARM = 'SELF_HARM',
  MELTDOWN = 'MELTDOWN',
  PANIC_ATTACK = 'PANIC_ATTACK',
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  FAMILY_CONFLICT = 'FAMILY_CONFLICT',
  BURNOUT = 'BURNOUT'
}

export enum UrgencyLevel {
  IMMEDIATE = 'IMMEDIATE',
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW'
}

export enum CrisisStatus {
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  FOLLOWUP_PENDING = 'FOLLOWUP_PENDING'
}

export class CreateCrisisIncidentDto {
  @IsEnum(CrisisType)
  @IsNotEmpty()
  type: CrisisType;

  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgencyLevel?: UrgencyLevel;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsString()
  @IsOptional()
  preferredLang?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerKeywords?: string[];

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}