import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Bookings that mean "this therapist works with this family". */
export const WORKING_BOOKING_STATUSES = ['ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;
/** Cases on which the care team is still involved. */
const OPEN_CASE_STATUSES = ['ACTIVE', 'ON_HOLD'] as const;

export interface JourneyChild {
  id: string;
  firstName: string;
  dateOfBirth: Date | null;
  /** The account that owns the child's profile. */
  ownerId: string;
}

/**
 * The two access questions of the journey, answered in one place:
 *
 *   guardian  — the child's profile owner, or a Guardian with authority to consent.
 *               Only they read/write the child's library, logs and shares.
 *   therapist — "works with" the child: a working booking with the family for this
 *               child (or an unspecified child), the child's open case team, or they
 *               have assigned this child something before.
 */
@Injectable()
export class JourneyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws 404/403; returns the child when `userId` is its guardian. */
  async assertGuardian(userId: string, childId: string): Promise<JourneyChild> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        firstName: true,
        dateOfBirth: true,
        profile: { select: { userId: true } },
        guardians: {
          where: { userId, hasAuthorityToConsent: true },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!child) throw new NotFoundException('Child not found.');
    if (child.profile?.userId !== userId && child.guardians.length === 0) {
      throw new ForbiddenException('You do not have access to this child.');
    }
    return {
      id: child.id,
      firstName: child.firstName,
      dateOfBirth: child.dateOfBirth,
      ownerId: child.profile.userId,
    };
  }

  /** Children this user is guardian of (owner or consenting guardian). */
  guardianChildrenWhere(userId: string): Prisma.ChildWhereInput {
    return {
      OR: [
        { profile: { userId } },
        { guardians: { some: { userId, hasAuthorityToConsent: true } } },
      ],
    };
  }

  /**
   * Children a therapist works with. A booking with no child named covers the booking
   * parent's own children.
   */
  therapistClientsWhere(therapistUserId: string): Prisma.ChildWhereInput {
    const working = { in: [...WORKING_BOOKING_STATUSES] };
    return {
      OR: [
        { bookings: { some: { therapist: { userId: therapistUserId }, status: working } } },
        {
          profile: {
            user: {
              patientBookings: {
                some: { therapist: { userId: therapistUserId }, status: working, childId: null },
              },
            },
          },
        },
        {
          cases: {
            some: {
              status: { in: [...OPEN_CASE_STATUSES] },
              OR: [
                { primaryTherapist: { userId: therapistUserId } },
                { therapists: { some: { removedAt: null, therapist: { userId: therapistUserId } } } },
              ],
            },
          },
        },
        { journeyResources: { some: { assignedById: therapistUserId } } },
      ],
    };
  }

  async assertTherapistOfChild(therapistUserId: string, childId: string) {
    const found = await this.prisma.child.findFirst({
      where: { id: childId, ...this.therapistClientsWhere(therapistUserId) },
      select: { id: true, firstName: true, dateOfBirth: true, profile: { select: { userId: true } } },
    });
    if (!found) throw new ForbiddenException('You can only assign to children you work with.');
    return found;
  }
}
