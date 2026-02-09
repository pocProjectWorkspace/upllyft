import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ApplyVerificationDto {
  @IsString()
  @MaxLength(500)
  bio: string;
}

export class UpdateContributorBioDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
