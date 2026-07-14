import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** How long a guardian has to act on a claim link before it must be re-sent. */
export const CLAIM_TTL_DAYS = 30;

/**
 * The details a facility holds about a guardian who is not (yet) an Upllyft user.
 * The email is REAL — and it goes on the Guardian row and the ChildClaim, never on
 * a User. That is the whole point.
 */
export interface GuardianDetails {
  name: string;
  email: string;
  phone?: string | null;
  relationship?: string | null;
}

/**
 * The parent claim — how a child a nursery created becomes a child a parent owns.
 *
 * TWO OUTCOMES, ONE INVARIANT.
 *
 *   ADOPT  the guardian is new to Upllyft. The placeholder child becomes theirs:
 *          we re-point it at their real profile and throw the shadow away.
 *
 *   MERGE  the guardian already has this child on Upllyft. The affiliation
 *          re-points to their REAL child and the placeholder is deleted. This is
 *          what upholds the locked principle — ONE child record, many lenses. A
 *          nursery enrolling a child who is already a clinic patient must not
 *          create a second copy of that child.
 *
 * WHAT MAKES THE MERGE SAFE: a PENDING_CONSENT affiliation accrues NO DATA. The
 * nursery cannot observe, screen, or open a child before the guardian acts, so the
 * placeholder is always empty when we delete it and no clinical history is ever
 * re-parented. We assert that rather than trust it — if a placeholder somehow has
 * data attached, something upstream wrote to a child it had no consent for, and
 * deleting it would destroy evidence of exactly that. So we refuse instead.
 */
@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ─── Minting an invite (used by BOTH the nursery roster and clinic walk-in) ──

  /**
   * Create the placeholder identity for a child whose guardian is not on Upllyft:
   * a SYNTHETIC shadow profile, a Guardian row holding the guardian's real details,
   * and a claim token.
   *
   * THE TRAP THIS EXISTS TO AVOID. `Child.profileId` is a required FK to a parent's
   * `UserProfile`, so a child cannot exist without a parent account — but a walk-in
   * or a nursery enrolment usually has no parent on the platform. The original
   * walk-in code solved that by minting a `User` on the guardian's REAL email with
   * no password. That guardian could then neither register (`register()` throws
   * "User already exists") nor log in (`validateUser()` returns null without a
   * password); the only way in was a password reset for an account they had no idea
   * existed. Nobody ever escaped it — the audit found 0 of 42 such guardians in dev
   * had ever obtained a password.
   *
   * So the shadow carries a synthetic address, and the guardian's real email lives
   * on the `Guardian` row and the claim. Their address stays free for the account
   * they will knowingly create.
   *
   * Returns the raw token; the caller sends it. Only the SHA-256 is persisted.
   */
  async createPlaceholderChild(
    tx: Prisma.TransactionClient,
    input: {
      firstName: string;
      dateOfBirth: Date;
      gender: string;
      guardian: GuardianDetails;
      referralSource?: string;
      extraChildData?: Prisma.ChildUncheckedCreateInput extends infer T ? Record<string, unknown> : never;
    },
  ): Promise<{ childId: string; shadowUserId: string }> {
    // `placeholder.` rather than `walkin.` — this path now serves nursery enrolments
    // too, and calling a two-year-old's roster entry a "walk-in" would be a small lie
    // that someone later reads as fact. The DOMAIN is what marks it synthetic
    // (audit-shadow-guardians.ts keys on @ancc.internal); the prefix is for humans.
    const shadowEmail = `placeholder.${randomUUID()}@ancc.internal`;

    const shadowUser = await tx.user.create({
      data: { email: shadowEmail, name: input.guardian.name, isEmailVerified: false },
      select: { id: true },
    });

    const shadowProfile = await tx.userProfile.create({
      data: {
        userId: shadowUser.id,
        fullName: input.guardian.name,
        email: shadowEmail,
        phoneNumber: input.guardian.phone ?? null,
        relationshipToChild: input.guardian.relationship ?? 'Guardian',
      },
      select: { id: true },
    });

    const child = await tx.child.create({
      data: {
        profileId: shadowProfile.id,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        referralSource: input.referralSource ?? null,
        ...(input.extraChildData ?? {}),
      } as Prisma.ChildUncheckedCreateInput,
      select: { id: true },
    });

    // The ONLY place the guardian's real identity lives until they claim.
    await tx.guardian.create({
      data: {
        childId: child.id,
        fullName: input.guardian.name,
        relationship: 'LEGAL_GUARDIAN',
        email: input.guardian.email.toLowerCase().trim(),
        phone: input.guardian.phone ?? null,
        hasAuthorityToConsent: true,
        isPrimaryContact: true,
        accessLevel: 'FULL',
      },
    });

    return { childId: child.id, shadowUserId: shadowUser.id };
  }

  /** Mint a claim for an existing child + affiliation. Returns the RAW token. */
  async createInvite(
    tx: Prisma.TransactionClient,
    input: {
      childId: string;
      affiliationId: string;
      facilityId: string;
      guardian: GuardianDetails;
      createdById: string;
    },
  ): Promise<string> {
    const { rawToken, tokenHash } = this.mintToken();

    await tx.childClaim.create({
      data: {
        tokenHash,
        childId: input.childId,
        affiliationId: input.affiliationId,
        facilityId: input.facilityId,
        guardianEmail: input.guardian.email.toLowerCase().trim(),
        guardianName: input.guardian.name,
        expiresAt: new Date(Date.now() + CLAIM_TTL_DAYS * 86_400_000),
        createdById: input.createdById,
      },
    });

    return rawToken;
  }

  /**
   * Send the claim link.
   *
   * The wording differs by facility type because THE TRUTH DIFFERS. A nursery has
   * seen nothing and is asking permission. A clinic the family walked into has
   * already met the child — telling that parent "we can't see anything about your
   * child" would be a transparent lie, and the version that gets forwarded to a
   * regulator. Say what is actually true in each case.
   */
  async sendInvite(
    facilityId: string | null,
    guardian: GuardianDetails,
    childFirstName: string,
    rawToken: string,
  ): Promise<void> {
    const facility = facilityId
      ? await this.prisma.facility.findUnique({
          where: { id: facilityId },
          select: { name: true, type: true },
        })
      : null;

    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const link = `${base}/claim/${rawToken}`;
    const name = facility?.name ?? 'A facility on Upllyft';
    const isClinic = facility?.type === 'CLINIC';

    const subject = isClinic
      ? `${name}: access ${childFirstName}'s records on Upllyft`
      : `${name} would like to record observations about ${childFirstName}`;

    const body = isClinic
      ? `<p><strong>${name}</strong> has added <strong>${childFirstName}</strong> to their records on Upllyft
           following your visit.</p>
         <p>Set up your account to see ${childFirstName}'s progress, appointments and reports,
            and to choose what you share.</p>`
      : `<p><strong>${name}</strong> has added <strong>${childFirstName}</strong> to their roster on Upllyft,
           and would like your permission to record observations about their development.</p>
         <p><strong>They cannot see anything about ${childFirstName} yet.</strong> Nothing is shared until you say so.</p>`;

    const html = `
      <p>Hello ${guardian.name},</p>
      ${body}
      <p><a href="${link}">Review this request</a></p>
      <p>This link expires in ${CLAIM_TTL_DAYS} days. If you don't recognise this,
         you can tell us on the same page and we'll let them know.</p>
    `;

    try {
      await this.email.sendEmail({
        to: guardian.email,
        subject,
        html,
        text: `${subject}\n\nReview: ${link}\n\n(Expires in ${CLAIM_TTL_DAYS} days.)`,
      });
    } catch (e: any) {
      // A failed send must NOT roll back the enrolment — the child IS on the roster
      // and staff can re-send. Log loudly rather than swallow.
      this.logger.error(
        `Claim email to ${guardian.email} failed: ${e?.message}. Staff can re-send.`,
      );
    }
  }

  /**
   * Only the HASH is stored. A leaked database must not yield working links into
   * children's records — the same reason password hashes exist.
   */
  mintToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('hex');
    return { rawToken, tokenHash: createHash('sha256').update(rawToken).digest('hex') };
  }

  /**
   * Unauthenticated preview of a claim link.
   *
   * MINIMISED ON PURPOSE. The bearer of this token is *probably* the guardian, but
   * all we actually know is that they hold a link. So: the nursery's name, the
   * child's first name, and nothing else. Date of birth and everything downstream
   * waits until they have authenticated — enough to recognise their child, not
   * enough to learn anything about a stranger's.
   */
  async preview(rawToken: string) {
    const claim = await this.findByToken(rawToken);

    return {
      status: claim.status,
      expired: claim.expiresAt < new Date(),
      facilityName: claim.facility.name,
      facilityType: claim.facility.type,
      childFirstName: claim.child.firstName,
      guardianName: claim.guardianName,
      /** The address the nursery gave us. Shown so they can spot a wrong one. */
      guardianEmail: claim.guardianEmail,
    };
  }

  /** The claiming user's own children, so they can say "this one is mine". */
  async candidates(rawToken: string, userId: string) {
    const claim = await this.assertClaimable(rawToken);

    const children = await this.prisma.child.findMany({
      where: { profile: { userId }, NOT: { id: claim.childId } },
      select: { id: true, firstName: true, dateOfBirth: true },
      orderBy: { firstName: 'asc' },
    });

    return {
      // Now they're authenticated, the DOB the nursery supplied is safe to show —
      // it's the only way to tell two children with the same first name apart.
      claimed: {
        firstName: claim.child.firstName,
        dateOfBirth: claim.child.dateOfBirth,
        facilityName: claim.facility.name,
      },
      yourChildren: children,
    };
  }

  /**
   * Accept a claim.
   *
   * NOTE WHAT THIS DOES NOT DO: it does not grant consent. Claiming your child and
   * agreeing to let a nursery record observations about them are two different
   * decisions, and collapsing them into one button would make the consent
   * meaningless. The affiliation stays PENDING_CONSENT until the guardian grants
   * separately through /child-consent/grant.
   *
   * ON IDENTITY: possession of the token is the credential — it was emailed to the
   * address the nursery holds, is single-use and expires. We do NOT require the
   * authenticated user's email to equal the claim's guardianEmail: a parent whose
   * Upllyft account uses a different address from the one the nursery has on file is
   * an ordinary case, and blocking them would leave them no route to their own
   * child. A mismatch is logged.
   */
  async accept(rawToken: string, userId: string, existingChildId?: string) {
    const claim = await this.assertClaimable(rawToken);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, userProfile: { select: { id: true } } },
    });

    if (user.email.toLowerCase() !== claim.guardianEmail.toLowerCase()) {
      this.logger.warn(
        `Claim ${claim.id} accepted by ${user.id} whose email differs from the ` +
          `address the facility supplied. Permitted (token possession is the ` +
          `credential) but recorded.`,
      );
    }

    await this.assertPlaceholderIsEmpty(claim.childId);

    const placeholderChildId = claim.childId;
    const shadowProfileId = claim.child.profileId;
    const shadowUserId = claim.child.profile.userId;

    const result = await this.prisma.$transaction(async tx => {
      // The claiming user needs a profile to hang a child off. A freshly-registered
      // parent who came straight here from the email has not been through onboarding
      // and so has none.
      const profileId =
        user.userProfile?.id ??
        (
          await tx.userProfile.create({
            data: { userId: user.id, fullName: user.name ?? claim.guardianName, email: user.email },
            select: { id: true },
          })
        ).id;

      let survivingChildId: string;

      if (existingChildId) {
        // ── MERGE ───────────────────────────────────────────────────────────────
        const mine = await tx.child.findFirst({
          where: { id: existingChildId, profile: { userId } },
          select: { id: true },
        });
        // Not your child => as far as you are concerned it does not exist. Never
        // confirm the id of a child belonging to someone else.
        if (!mine) throw new NotFoundException('Child not found.');

        const clash = await tx.childAffiliation.findFirst({
          where: { childId: existingChildId, facilityId: claim.facilityId, endedAt: null },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException(
            'That child is already enrolled at this facility.',
          );
        }

        // Re-point the affiliation at the REAL child. The affiliation keeps its id,
        // so the claim and any consent already pointing at it stay valid.
        await tx.childAffiliation.update({
          where: { id: claim.affiliationId },
          data: { childId: existingChildId },
        });

        await tx.childClaim.update({
          where: { id: claim.id },
          data: {
            childId: existingChildId,
            mergedFromPlaceholderId: placeholderChildId,
            status: 'ACCEPTED',
            claimedAt: new Date(),
            claimedByUserId: userId,
          },
        });

        // The placeholder's Guardian row is about to be cascade-deleted with it, and
        // it is the ONLY place the guardian's real contact details live. Carry them
        // across first, or the nursery loses the ability to contact the guardian of
        // a child on its own roster — precisely the children it still needs to chase.
        // Upsert-by-hand: the parent may already be a guardian of their own child.
        const alreadyGuardian = await tx.guardian.findFirst({
          where: { childId: existingChildId, userId },
          select: { id: true },
        });

        if (alreadyGuardian) {
          await tx.guardian.update({
            where: { id: alreadyGuardian.id },
            data: { hasAuthorityToConsent: true },
          });
        } else {
          await tx.guardian.create({
            data: {
              childId: existingChildId,
              userId,
              fullName: claim.guardianName,
              email: claim.guardianEmail,
              relationship: 'LEGAL_GUARDIAN',
              hasAuthorityToConsent: true,
              isPrimaryContact: true,
              accessLevel: 'FULL',
            },
          });
        }

        // Now the placeholder can die.
        await tx.child.delete({ where: { id: placeholderChildId } });

        survivingChildId = existingChildId;
      } else {
        // ── ADOPT ───────────────────────────────────────────────────────────────
        //
        // ORDER IS LOAD-BEARING. `Child.profile` is `onDelete: Cascade`, so deleting
        // the shadow profile while the child still points at it would DELETE THE
        // CHILD. Re-point first, then delete.
        await tx.child.update({
          where: { id: placeholderChildId },
          data: { profileId },
        });

        // The guardian row already holds their real name and email; now it gains the
        // user it belongs to, which is what lets them consent.
        await tx.guardian.updateMany({
          where: { childId: placeholderChildId, userId: null },
          data: { userId },
        });

        await tx.childClaim.update({
          where: { id: claim.id },
          data: { status: 'ACCEPTED', claimedAt: new Date(), claimedByUserId: userId },
        });

        survivingChildId = placeholderChildId;
      }

      // The shadow account existed only to satisfy `Child.profileId`. Nothing points
      // at it now, and it is not a person — delete it so it can never be logged into,
      // counted as a parent, or emailed. Cascade takes the UserProfile with it.
      await tx.user.delete({ where: { id: shadowUserId } });

      return { survivingChildId };
    });

    this.logger.log(
      `Claim ${claim.id} accepted by user ${userId} ` +
        `(${existingChildId ? 'MERGED into existing child' : 'ADOPTED placeholder'}); ` +
        `shadow user ${shadowUserId}/profile ${shadowProfileId} removed.`,
    );

    return {
      childId: result.survivingChildId,
      facilityId: claim.facilityId,
      facilityName: claim.facility.name,
      merged: Boolean(existingChildId),
      // The affiliation is STILL PENDING_CONSENT. Claiming is not consenting.
      consentRequired: true,
    };
  }

  /**
   * "This is not my child."
   *
   * Deliberately does NOT require an account. Making someone sign up to a platform
   * in order to tell it that it holds a record about a child who isn't theirs would
   * be absurd, and they would simply not do it — and we would keep the affiliation.
   */
  async dispute(rawToken: string, reason?: string) {
    const claim = await this.assertClaimable(rawToken);

    await this.prisma.$transaction([
      this.prisma.childClaim.update({
        where: { id: claim.id },
        data: { status: 'DISPUTED', disputeReason: reason ?? null },
      }),
      // End the affiliation immediately. Until someone sorts this out, the facility
      // gets nothing — and since it was PENDING_CONSENT it never had anything.
      this.prisma.childAffiliation.update({
        where: { id: claim.affiliationId },
        data: { status: 'ENDED', endedAt: new Date() },
      }),
    ]);

    this.logger.warn(
      `Claim ${claim.id} DISPUTED at facility ${claim.facilityId}. Affiliation ended. ` +
        `Reason: ${reason ?? '(none given)'}`,
    );

    return { disputed: true, facilityName: claim.facility.name };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async findByToken(rawToken: string) {
    if (!rawToken || rawToken.length < 32) {
      throw new NotFoundException('This link is not valid.');
    }

    const claim = await this.prisma.childClaim.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        childId: true,
        affiliationId: true,
        facilityId: true,
        guardianEmail: true,
        guardianName: true,
        facility: { select: { name: true, type: true } },
        child: {
          select: {
            firstName: true,
            dateOfBirth: true,
            profileId: true,
            profile: { select: { userId: true } },
          },
        },
      },
    });

    if (!claim) throw new NotFoundException('This link is not valid.');
    return claim;
  }

  /** A claim that is PENDING and in date. Everything else is a dead end, said plainly. */
  private async assertClaimable(rawToken: string) {
    const claim = await this.findByToken(rawToken);

    if (claim.status === 'ACCEPTED') {
      throw new ConflictException('This child has already been claimed.');
    }
    if (claim.status === 'DISPUTED') {
      throw new ConflictException('This request was already reported as not your child.');
    }
    if (claim.status === 'REVOKED') {
      throw new ConflictException('The facility withdrew this request.');
    }
    if (claim.status === 'EXPIRED' || claim.expiresAt < new Date()) {
      // Record the expiry so the facility's roster can show it and offer a re-send.
      if (claim.status === 'PENDING') {
        await this.prisma.childClaim.update({
          where: { id: claim.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException(
        'This link has expired. Ask the nursery to send you a new one.',
      );
    }

    return claim;
  }

  /**
   * The invariant that makes deleting a placeholder safe.
   *
   * A PENDING_CONSENT affiliation must accrue no data — the nursery cannot observe,
   * screen or open the child before the guardian acts. If that is somehow false,
   * DO NOT delete: something wrote to a child it had no consent for, and the rows
   * proving it are the last thing we should destroy. Refuse and shout.
   */
  private async assertPlaceholderIsEmpty(childId: string): Promise<void> {
    const [assessments, cases, records] = await Promise.all([
      this.prisma.assessment.count({ where: { childId } }),
      this.prisma.case.count({ where: { childId } }),
      this.prisma.clinicalRecord.count({ where: { case: { childId } } }),
    ]);

    const total = assessments + cases + records;
    if (total > 0) {
      this.logger.error(
        `Placeholder child ${childId} has ${assessments} assessment(s), ${cases} case(s), ` +
          `${records} clinical record(s) — but it was never consented. Refusing to merge: ` +
          `data was written to a child under a PENDING_CONSENT affiliation, which should ` +
          `be impossible. Investigate before this is resolved by hand.`,
      );
      throw new ConflictException(
        'This record has data attached and cannot be merged automatically. ' +
          'Our team has been alerted.',
      );
    }
  }
}
