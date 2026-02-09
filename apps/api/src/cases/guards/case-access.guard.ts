import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const CASE_ACCESS_KEY = 'caseAccess';

export type CaseAccessLevel = 'view' | 'edit' | 'manage';

/**
 * Decorator to set required access level on route handlers.
 * Usage: @CaseAccess('edit')
 */
export const CaseAccess = (level: CaseAccessLevel) =>
  Reflect.metadata(CASE_ACCESS_KEY, level);

/**
 * Guard that checks if the current user has access to the case
 * specified by :caseId param. Allows:
 * - Therapists assigned to the case (via CaseTherapist)
 * - The parent of the child linked to the case
 * - Platform admins
 */
@Injectable()
export class CaseAccessGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    // Admins always have access
    if (user.role === 'ADMIN') return true;

    const caseId = request.params.caseId || request.params.id;
    if (!caseId) return true; // No case param, skip guard

    const requiredLevel =
      this.reflector.get<CaseAccessLevel>(CASE_ACCESS_KEY, context.getHandler()) || 'view';

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: {
            profile: true,
          },
        },
        therapists: {
          where: { removedAt: null },
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');

    // Check if user is the parent (owner of the child profile)
    if (caseRecord.child.profile.userId === user.id) {
      // Parents can only view, not edit/manage
      if (requiredLevel === 'view') {
        request.caseRecord = caseRecord;
        request.caseRole = 'parent';
        return true;
      }
      throw new ForbiddenException('Parents cannot modify case data directly');
    }

    // Check if user is a therapist on this case
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: user.id },
    });

    if (!therapistProfile) {
      throw new ForbiddenException('No access to this case');
    }

    // Check if user is the primary therapist
    const isPrimary = caseRecord.primaryTherapistId === therapistProfile.id;

    // Check if user is assigned via CaseTherapist
    const assignment = caseRecord.therapists.find(
      (t) => t.therapistId === therapistProfile.id,
    );

    if (!isPrimary && !assignment) {
      throw new ForbiddenException('Not assigned to this case');
    }

    const effectiveRole = isPrimary ? 'PRIMARY' : assignment?.role;

    // For manage level, only PRIMARY role
    if (requiredLevel === 'manage' && effectiveRole !== 'PRIMARY') {
      throw new ForbiddenException('Only primary therapist can perform this action');
    }

    // For edit level, check permissions
    if (requiredLevel === 'edit' && !isPrimary) {
      const perms = (assignment?.permissions as any) || {};
      if (!perms.canEdit) {
        throw new ForbiddenException('No edit permission on this case');
      }
    }

    request.caseRecord = caseRecord;
    request.caseRole = 'therapist';
    request.caseAssignment = assignment;
    return true;
  }
}
