import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

/** Raising a concern takes no body — the evidence is gathered from what's already recorded. */
export class RaiseConcernDto {
  /** Optional steer for the coaching, e.g. "focus on the speech observations". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateConcernDto {
  /** The parent-facing summary, edited by the lead before sharing. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(6000)
  parentSummary!: string;
}

export class AcknowledgeConcernDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;
}
