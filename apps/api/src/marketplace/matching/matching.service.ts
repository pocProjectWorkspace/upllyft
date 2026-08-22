import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CONCERNS, type ChildNeeds, type Concern } from './matching.util';

/**
 * Resolves "what do we know about this child" for discovery. The three information
 * levels drive the whole adaptive entry:
 *
 *   screening      — a COMPLETED assessment exists → flaggedDomains, confident ranking
 *   self_reported  — the parent picked a concern in the 30-second picker
 *   none           — pure browse, no badges, sort by rating
 *
 * A childId is only ever honoured for the child's own guardian — needs are derived
 * from screening data, and a stranger must not learn a child's flags through match
 * badges on a public listing.
 */
@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveNeeds(
    actor: { id: string },
    childId?: string,
    concern?: string,
  ): Promise<ChildNeeds> {
    if (childId) {
      const child = await this.prisma.child.findUnique({
        where: { id: childId },
        select: { firstName: true, profile: { select: { userId: true } } },
      });
      if (!child) throw new NotFoundException('Child not found.');
      if (child.profile?.userId !== actor.id) {
        const guardian = await this.prisma.guardian.findFirst({
          where: { childId, userId: actor.id, hasAuthorityToConsent: true },
          select: { id: true },
        });
        if (!guardian) throw new ForbiddenException('You do not have access to this child.');
      }

      const assessment = await this.prisma.assessment.findFirst({
        where: { childId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { flaggedDomains: true },
      });

      if (assessment && assessment.flaggedDomains.length > 0) {
        return {
          source: 'screening',
          childName: child.firstName,
          flaggedDomains: assessment.flaggedDomains,
          concern: null,
        };
      }

      // Child known but unscreened — a concern (if given) still soft-matches.
      if (concern && (CONCERNS as readonly string[]).includes(concern)) {
        return {
          source: 'self_reported',
          childName: child.firstName,
          flaggedDomains: [],
          concern: concern as Concern,
        };
      }
      return { source: 'none', childName: child.firstName, flaggedDomains: [], concern: null };
    }

    if (concern && (CONCERNS as readonly string[]).includes(concern)) {
      return { source: 'self_reported', childName: null, flaggedDomains: [], concern: concern as Concern };
    }

    return { source: 'none', childName: null, flaggedDomains: [], concern: null };
  }
}
