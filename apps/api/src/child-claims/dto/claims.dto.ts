import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DisputeClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Claim a child.
 *
 * `existingChildId` present => MERGE: a child the guardian already has on Upllyft.
 *                              The affiliation re-points to the real record and the
 *                              placeholder is deleted.
 * `existingChildId` absent  => ADOPT: new to Upllyft. The placeholder becomes theirs.
 */
export class AcceptClaimDto {
  @IsOptional()
  @IsString()
  existingChildId?: string;
}
