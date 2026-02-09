// apps/api/src/profile/dto/update-profile.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';

/**
 * DTO for updating user profile
 * Extends CreateProfileDto but makes all fields optional using PartialType
 */
export class UpdateProfileDto extends PartialType(CreateProfileDto) {}