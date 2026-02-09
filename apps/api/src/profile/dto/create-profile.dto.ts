// apps/api/src/profile/dto/create-profile.dto.ts

import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RelationshipType {
  PARENT = 'Parent',
  GUARDIAN = 'Guardian',
  CAREGIVER = 'Caregiver',
  OTHER = 'Other',
}

export enum CommunicationPreference {
  EMAIL = 'Email',
  SMS = 'SMS',
  WHATSAPP = 'WhatsApp',
  PHONE = 'Phone',
}

export class CreateProfileDto {
  @ApiPropertyOptional({ description: 'Full name of the parent/caregiver' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Relationship to child',
    enum: RelationshipType
  })
  @IsEnum(RelationshipType)
  @IsOptional()
  relationshipToChild?: RelationshipType;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @ValidateIf(o => o.phoneNumber && o.phoneNumber.length > 0)
  @IsString()
  // Relaxed validation for international numbers (allows + and 7-15 digits)
  @Matches(/^\+?[\d\s-]{7,15}$/, {
    message: 'Please provide a valid phone number'
  })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Alternate phone number' })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @ValidateIf(o => o.email && o.email.length > 0)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @ValidateIf(o => o.pincode && o.pincode.length > 0)
  @IsString()
  // Relaxed validation for international pincodes (alphanumeric, 3-10 chars)
  @Matches(/^[a-zA-Z0-9\s-]{3,10}$/, {
    message: 'Please provide a valid postal/zip code'
  })
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ description: 'Occupation' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional({ description: 'Education level' })
  @IsString()
  @IsOptional()
  educationLevel?: string;

  @ApiPropertyOptional({ description: 'Preferred language', default: 'en' })
  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'Communication preference',
    enum: CommunicationPreference
  })
  @IsString()
  @IsOptional()
  communicationPreference?: string;
}