import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { FacilityType, LicenseAuthority, Emirate, FacilityRole } from '@prisma/client';

/**
 * NOTE ON `FacilityType`: creation is restricted to NURSERY | SCHOOL at the service
 * layer, not here, so the rejection carries a reason the caller can act on rather
 * than a bare enum validation error. See FacilitiesService.create.
 */
export class CreateFacilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEnum(FacilityType)
  type!: FacilityType;

  /** Join an existing organization. Omitted => one is created and you own it. */
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNo?: string;

  @IsOptional()
  @IsEnum(LicenseAuthority)
  licenseAuthority?: LicenseAuthority;

  @IsOptional()
  @IsEnum(Emirate)
  emirate?: Emirate;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Platform-admin onboarding: create the organisation, its first site, and name the admin,
 * in one action. `type` is NURSERY | SCHOOL only (a clinic is onboarded through the legacy
 * clinic path — see FacilitiesService.create).
 */
export class OnboardNurseryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEnum(FacilityType)
  type!: FacilityType;

  /** The person who will run this nursery. Must already have an Upllyft account. */
  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNo?: string;

  @IsOptional()
  @IsEnum(LicenseAuthority)
  licenseAuthority?: LicenseAuthority;

  @IsOptional()
  @IsEnum(Emirate)
  emirate?: Emirate;
}

export class UpdateFacilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNo?: string;

  @IsOptional()
  @IsEnum(LicenseAuthority)
  licenseAuthority?: LicenseAuthority;

  @IsOptional()
  @IsEnum(Emirate)
  emirate?: Emirate;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  /** Free text — "2–3 years". Presentation only; it gates nothing. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ageBandLabel?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ageBandLabel?: string;
}

export class AddFacilityMemberDto {
  /** An existing Upllyft user's email. Staff are invited, never fabricated. */
  @IsEmail()
  email!: string;

  @IsEnum(FacilityRole)
  role!: FacilityRole;
}

export class UpdateFacilityMemberDto {
  @IsEnum(FacilityRole)
  role!: FacilityRole;
}
