import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Domain of the placeholder email a deleted account gets; frees the real address. */
export const DELETED_EMAIL_DOMAIN = 'deleted.upllyft.com';

export const isDeletedAccountEmail = (email?: string | null) =>
  !!email && email.endsWith(`@${DELETED_EMAIL_DOMAIN}`);

/** Roles that may delete themselves; staff and organisation accounts go through support. */
const SELF_DELETE_ROLES: Role[] = [Role.USER, Role.THERAPIST, Role.EDUCATOR];

const REDACTED = '[deleted]';

/**
 * Right to deletion (PDPL / GDPR): anonymise the account and its personal data, and
 * leave the rows in place. Clinical records, payments and community threads reference
 * the user, so rows are scrubbed rather than removed, and the account can no longer
 * sign in: no password, no Google link, and a placeholder email (refresh is refused
 * for it in AuthService).
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /** DELETE /users/me. Throws a 400 with the reason when the account needs a handover first. */
  async deleteOwnAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!user || isDeletedAccountEmail(user.email)) throw new NotFoundException('Account not found');

    if (!SELF_DELETE_ROLES.includes(user.role)) {
      throw new BadRequestException(
        'Staff and organisation accounts can’t be deleted from settings. Email support@upllyft.com and we’ll do it for you.',
      );
    }

    const [ownsClinic, ownsFacility, openCases] = await Promise.all([
      this.prisma.clinic.count({ where: { adminId: userId } }),
      this.prisma.facilityMember.count({ where: { userId, role: 'OWNER', status: 'ACTIVE' } }),
      this.prisma.case.count({
        where: {
          primaryTherapist: { userId },
          status: { in: [CaseStatus.ACTIVE, CaseStatus.ON_HOLD] },
        },
      }),
    ]);
    if (ownsClinic || ownsFacility) {
      throw new BadRequestException(
        'You own a clinic, nursery or school on Upllyft. Hand ownership to someone else, or email support@upllyft.com, before deleting your account.',
      );
    }
    if (openCases) {
      throw new BadRequestException(
        `You are the primary therapist on ${openCases} open case${openCases === 1 ? '' : 's'}. Transfer or discharge ${openCases === 1 ? 'it' : 'them'} before deleting your account.`,
      );
    }

    await this.anonymise(userId, user.email);
    await this.auditService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'DELETE',
      metadata: { reason: 'Self-service account deletion' },
    });
    return { success: true, deletedAt: new Date().toISOString() };
  }

  /** Scrubs personal data. Shared with the admin PDPL deletion (AdminService.deleteUserData). */
  async anonymise(userId: string, originalEmail: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: REDACTED,
          email: `deleted-${userId}@${DELETED_EMAIL_DOMAIN}`,
          phone: null,
          location: null,
          bio: null,
          image: null,
          password: null,
          googleId: null,
          ssoSource: null,
          emergencyContact: null,
          emergencyPhone: null,
          website: null,
          education: null,
          organization: null,
          licenseNumber: null,
          city: null,
          state: null,
          contributorBio: null,
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        },
      });

      await tx.userProfile.updateMany({
        where: { userId },
        data: {
          fullName: REDACTED,
          phoneNumber: null,
          alternatePhone: null,
          email: null,
          occupation: null,
        },
      });

      await tx.child.updateMany({
        where: { profile: { userId } },
        data: {
          firstName: REDACTED,
          nickname: null,
          address: null,
          city: null,
          state: null,
          nationality: null,
          placeOfBirth: null,
        },
      });

      // Off Find care and out of booking; contact and ID details removed.
      await tx.therapistProfile.updateMany({
        where: { userId },
        data: {
          isActive: false,
          acceptingBookings: false,
          bio: null,
          profileImage: null,
          phone: null,
          emiratesId: null,
          insurancePolicyNumber: null,
        },
      });

      await tx.message.updateMany({ where: { senderId: userId }, data: { body: REDACTED } });
      await tx.miraMessage.updateMany({
        where: { conversation: { userId } },
        data: { content: REDACTED },
      });

      // No more push notifications or queued emails to the old address.
      await tx.fcmToken.deleteMany({ where: { userId } });
      await tx.emailOutbox.deleteMany({ where: { toEmail: originalEmail, sentAt: null } });
    });
  }
}
