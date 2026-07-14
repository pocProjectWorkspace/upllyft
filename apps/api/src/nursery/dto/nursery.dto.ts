import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';

/**
 * Add a child to a nursery roster.
 *
 * NOTE WHAT IS NOT HERE: no consent field, no "guardian agrees" checkbox. Staff
 * CAPTURE consent, they never GIVE it. A nursery adding a child to its roster is a
 * statement about attendance, not about permission — the guardian grants that
 * themselves, through the claim link, or the record stays shut.
 */
export class AddRosterChildDto {
  /**
   * The child's name. `Child` has ONE name column (`firstName`) — there is no
   * `lastName` anywhere in the schema, and the platform already puts full given
   * names here. Accepting a surname we have nowhere to put would either lose it
   * silently or smuggle it into `nickname`, which means something else.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender!: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  /** FacilityMember.id of the keyworker. */
  @IsOptional()
  @IsString()
  keyworkerId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  guardianName!: string;

  /** The guardian's REAL email. Never becomes a User row until they claim. */
  @IsEmail()
  guardianEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  guardianRelationship?: string;
}

export class UpdateRosterPlacementDto {
  @IsOptional()
  @IsString()
  roomId?: string | null;

  @IsOptional()
  @IsString()
  keyworkerId?: string | null;
}

export class DisputeClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Claim a child.
 *
 * `existingChildId` present  => MERGE: this is a child the guardian already has on
 *                               Upllyft. The affiliation re-points to the real
 *                               record and the placeholder is deleted.
 * `existingChildId` absent   => ADOPT: new to Upllyft. The placeholder becomes
 *                               theirs.
 */
export class AcceptClaimDto {
  @IsOptional()
  @IsString()
  existingChildId?: string;
}
