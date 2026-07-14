import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimsService, CLAIM_TTL_DAYS, type GuardianDetails } from '../child-claims/claims.service';
import { assertFacilityMember, type FacilityActor } from '../common/facility-scope';
import { attachChildToFacility, childOnRoster } from '../common/child-scope';
import { AddRosterChildDto, UpdateRosterPlacementDto } from './dto/nursery.dto';

/**
 * The consent a nursery needs to hold a child's observations. One constant, used by
 * the grant, the roster flag and the access gate alike — if these three ever drift
 * apart, the roster will cheerfully report "consented" for a consent that does not
 * open the record.
 */
export const NURSERY_CONSENT_TYPE = 'DATA_PROCESSING' as const;

/** Roles that may put a child on a roster. A KEYWORKER observes; they do not enrol. */
const ROSTER_ADMIN_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];

@Injectable()
export class NurseryService {
  private readonly logger = new Logger(NurseryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claims: ClaimsService,
  ) {}

  /**
   * The roster. Names and consent status — NOT records.
   *
   * Uses `childOnRoster`, which includes PENDING_CONSENT children, because a nursery
   * must be able to see who it is still waiting on in order to chase them. Opening
   * any of those children's records is a different question, answered by
   * `resolveChildAccess`, which requires an ACTIVE affiliation AND a live consent.
   * List is not read. That split is the whole design.
   */
  async roster(actor: FacilityActor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId);

    const children = await this.prisma.child.findMany({
      where: childOnRoster(facilityId),
      select: {
        id: true,
        firstName: true,
        dateOfBirth: true,
        gender: true,
        affiliations: {
          where: { facilityId, endedAt: null },
          select: {
            id: true,
            status: true,
            dataScope: true,
            startedAt: true,
            room: { select: { id: true, name: true } },
            keyworker: {
              select: { id: true, user: { select: { id: true, name: true } } },
            },
          },
          take: 1,
        },
        consents: {
          where: { facilityId, revokedAt: null, type: NURSERY_CONSENT_TYPE },
          select: { id: true, createdAt: true },
          take: 1,
        },
        guardians: {
          where: { isPrimaryContact: true },
          select: { fullName: true, email: true, userId: true },
          take: 1,
        },
        claims: {
          where: { facilityId },
          select: { id: true, status: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return children.map(c => {
      const aff = c.affiliations[0];
      const claim = c.claims[0];
      const guardian = c.guardians[0];
      const consentGranted = c.consents.length > 0;

      return {
        childId: c.id,
        firstName: c.firstName,
        dateOfBirth: c.dateOfBirth,
        gender: c.gender,
        affiliationId: aff?.id ?? null,
        affiliationStatus: aff?.status ?? null,
        room: aff?.room ?? null,
        keyworker: aff?.keyworker
          ? { memberId: aff.keyworker.id, name: aff.keyworker.user.name }
          : null,
        // false => the record is LOCKED. The nursery may see this row and nothing
        // behind it. This is the gate working, not a bug.
        consentGranted,
        guardian: guardian
          ? {
              name: guardian.fullName,
              email: guardian.email,
              onPlatform: guardian.userId !== null,
            }
          : null,
        claim: claim
          ? { id: claim.id, status: claim.status, expiresAt: claim.expiresAt }
          : null,
      };
    });
  }

  /**
   * Add a child to the roster, and invite their guardian to claim them.
   *
   * THE SHADOW-ACCOUNT TRAP, AND WHY WE DO NOT FALL INTO IT.
   *
   * `Child.profileId` is a REQUIRED FK to a parent's `UserProfile`, so a child cannot
   * exist without a parent account — but most nursery children have no parent on
   * Upllyft. The walk-in flow solved this by minting a `User` on the guardian's REAL
   * email with no password. That guardian could then neither register (`register()`
   * throws "User already exists") nor log in (`validateUser()` returns null with no
   * password), and the only way in was a password reset for an account they had no
   * idea existed.
   *
   * So: the placeholder child hangs off a SYNTHETIC profile, and the guardian's real
   * email lives on the `Guardian` row and the `ChildClaim` — never on a `User`. Their
   * address stays free, and the account they eventually hold is one they knowingly
   * created.
   *
   * AND NO CONSENT IS CREATED HERE. The affiliation lands at PENDING_CONSENT. A
   * nursery adding a child to a roster is a statement about attendance; it is not
   * the guardian agreeing to anything, and it must never be recorded as if it were.
   */
  async addChild(actor: FacilityActor, facilityId: string, dto: AddRosterChildDto) {
    await assertFacilityMember(this.prisma, actor, facilityId, ROSTER_ADMIN_ROLES);

    await this.assertPlacementValid(facilityId, dto.roomId, dto.keyworkerId);

    const dob = new Date(dto.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new BadRequestException('Date of birth must be a real date in the past.');
    }

    const guardian: GuardianDetails = {
      name: dto.guardianName,
      email: dto.guardianEmail.toLowerCase().trim(),
      phone: dto.guardianPhone ?? null,
      relationship: dto.guardianRelationship ?? null,
    };

    const { childId, affiliationId, rawToken } = await this.prisma.$transaction(async tx => {
      const { childId } = await this.claims.createPlaceholderChild(tx, {
        firstName: dto.firstName,
        dateOfBirth: dob,
        gender: dto.gender,
        guardian,
        referralSource: 'Nursery roster',
      });

      const { affiliationId } = await attachChildToFacility(tx, childId, facilityId, {
        type: 'ENROLLED',
        roomId: dto.roomId ?? null,
        keyworkerId: dto.keyworkerId ?? null,
        // status defaults to PENDING_CONSENT for an enrolment. Stated, not assumed.
      });

      const rawToken = await this.claims.createInvite(tx, {
        childId,
        affiliationId,
        facilityId,
        guardian,
        createdById: actor.id,
      });

      return { childId, affiliationId, rawToken };
    });

    await this.claims.sendInvite(facilityId, guardian, dto.firstName, rawToken);

    this.logger.log(
      `Roster add: child ${childId} enrolled at facility ${facilityId} (PENDING_CONSENT) by ${actor.id}`,
    );

    return { childId, affiliationId, claimSent: true };
  }

  /** Move a child between rooms, or reassign their keyworker. */
  async updatePlacement(
    actor: FacilityActor,
    facilityId: string,
    affiliationId: string,
    dto: UpdateRosterPlacementDto,
  ) {
    await assertFacilityMember(this.prisma, actor, facilityId, ROSTER_ADMIN_ROLES);

    const affiliation = await this.prisma.childAffiliation.findFirst({
      where: { id: affiliationId, facilityId, endedAt: null },
      select: { id: true },
    });
    if (!affiliation) throw new NotFoundException('This child is not on your roster.');

    await this.assertPlacementValid(
      facilityId,
      dto.roomId ?? undefined,
      dto.keyworkerId ?? undefined,
    );

    return this.prisma.childAffiliation.update({
      where: { id: affiliationId },
      data: {
        ...(dto.roomId !== undefined && { roomId: dto.roomId }),
        ...(dto.keyworkerId !== undefined && { keyworkerId: dto.keyworkerId }),
      },
      select: { id: true, roomId: true, keyworkerId: true },
    });
  }

  /**
   * A child has left the nursery. ENDS the affiliation — it does not delete the
   * child, who exists independently of any one setting.
   */
  async endEnrolment(actor: FacilityActor, facilityId: string, affiliationId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, ROSTER_ADMIN_ROLES);

    const affiliation = await this.prisma.childAffiliation.findFirst({
      where: { id: affiliationId, facilityId, endedAt: null },
      select: { id: true },
    });
    if (!affiliation) throw new NotFoundException('This child is not on your roster.');

    await this.prisma.$transaction([
      this.prisma.childAffiliation.update({
        where: { id: affiliationId },
        data: { status: 'ENDED', endedAt: new Date() },
      }),
      // An unclaimed invite for a child who has left is a live link to a record the
      // facility no longer has any relationship with. Kill it.
      this.prisma.childClaim.updateMany({
        where: { affiliationId, status: 'PENDING' },
        data: { status: 'REVOKED' },
      }),
    ]);

    return { ended: true };
  }

  /** Re-send the claim link — the commonest support request there will ever be. */
  async resendClaim(actor: FacilityActor, facilityId: string, affiliationId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, ROSTER_ADMIN_ROLES);

    const claim = await this.prisma.childClaim.findFirst({
      where: { affiliationId, facilityId, status: 'PENDING' },
      select: {
        id: true,
        guardianEmail: true,
        guardianName: true,
        child: { select: { firstName: true } },
      },
    });
    if (!claim) throw new NotFoundException('No pending claim for this child.');

    // Rotate the token rather than re-sending the old one: the previous link may be
    // sitting in a forwarded email or a shared inbox.
    const { rawToken, tokenHash } = this.claims.mintToken();

    await this.prisma.childClaim.update({
      where: { id: claim.id },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + CLAIM_TTL_DAYS * 86_400_000),
      },
    });

    await this.claims.sendInvite(
      facilityId,
      { name: claim.guardianName, email: claim.guardianEmail },
      claim.child.firstName,
      rawToken,
    );

    return { sent: true };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /** A room or keyworker from another facility must not be assignable. */
  private async assertPlacementValid(
    facilityId: string,
    roomId?: string,
    keyworkerId?: string,
  ): Promise<void> {
    if (roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: roomId, facilityId },
        select: { id: true },
      });
      if (!room) throw new NotFoundException('Room not found at this facility.');
    }

    if (keyworkerId) {
      const member = await this.prisma.facilityMember.findFirst({
        where: { id: keyworkerId, facilityId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!member) throw new NotFoundException('Keyworker is not staff at this facility.');
    }
  }

}
