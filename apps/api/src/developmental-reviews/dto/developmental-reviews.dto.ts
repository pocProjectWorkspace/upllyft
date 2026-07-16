import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

/** Creating a review takes no body — it is assembled from the screening already recorded. */
export class CreateDevReviewDto {
  /** Optional non-diagnostic next-step note, overriding the generated one. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recommendation?: string;
}

export class UpdateDevReviewDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(6000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recommendation?: string;
}

export class AcknowledgeDevReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;
}
