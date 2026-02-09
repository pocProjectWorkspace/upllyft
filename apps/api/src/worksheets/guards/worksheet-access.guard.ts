import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class WorksheetAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const worksheetId = request.params.id;

    if (!worksheetId) {
      return true; // No worksheet ID in route, skip guard
    }

    // Admins have full access
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      return true;
    }

    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
      select: {
        id: true,
        createdById: true,
        childId: true,
        isPublic: true,
        child: {
          select: {
            profileId: true,
            cases: {
              select: {
                therapists: {
                  select: { therapistId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!worksheet) {
      throw new NotFoundException('Worksheet not found');
    }

    // Owner always has access
    if (worksheet.createdById === user.id) {
      return true;
    }

    // Public community worksheets are readable by all authenticated users
    if (worksheet.isPublic && request.method === 'GET') {
      return true;
    }

    // Therapists have access if they're assigned to the child's case
    if (
      user.role === Role.THERAPIST &&
      worksheet.child?.cases
    ) {
      const hasAccess = worksheet.child.cases.some((c) =>
        c.therapists.some((t) => t.therapistId === user.id),
      );
      if (hasAccess) return true;
    }

    // Parents have access if the child belongs to their profile
    if (user.role === Role.USER || user.role === Role.EDUCATOR) {
      if (worksheet.child) {
        const userProfile = await this.prisma.userProfile.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (userProfile && worksheet.child.profileId === userProfile.id) {
          return true;
        }
      }

      // Also have access via active worksheet assignments
      const assignment = await this.prisma.worksheetAssignment.findFirst({
        where: {
          worksheetId,
          assignedToId: user.id,
        },
        select: { id: true },
      });
      if (assignment) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have access to this worksheet');
  }
}
