import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorksheetContributorService {
  private readonly logger = new Logger(WorksheetContributorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get contributor profile with publishing stats.
   */
  async getContributorProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        isVerifiedContributor: true,
        verifiedContributorAt: true,
        contributorBio: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      publishedCount,
      totalClones,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      this.prisma.worksheet.count({
        where: { createdById: userId, isPublic: true },
      }),
      this.prisma.worksheet.aggregate({
        where: { createdById: userId, isPublic: true },
        _sum: { cloneCount: true },
      }),
      this.prisma.worksheet.aggregate({
        where: { createdById: userId, isPublic: true },
        _sum: { reviewCount: true },
      }),
      this.prisma.worksheet.aggregate({
        where: {
          createdById: userId,
          isPublic: true,
          averageRating: { not: null },
        },
        _avg: { averageRating: true },
      }),
    ]);

    return {
      ...user,
      stats: {
        publishedWorksheets: publishedCount,
        totalClones: totalClones._sum.cloneCount ?? 0,
        totalReviews: totalReviews._sum.reviewCount ?? 0,
        averageRating: avgRating._avg.averageRating
          ? Math.round(avgRating._avg.averageRating * 10) / 10
          : null,
      },
    };
  }

  /**
   * Apply for verified contributor badge.
   */
  async applyForVerification(userId: string, bio: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerifiedContributor: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerifiedContributor) {
      throw new BadRequestException('User is already a verified contributor');
    }

    // Check minimum requirements: at least 3 published worksheets with avg rating >= 3.5
    const publishedCount = await this.prisma.worksheet.count({
      where: { createdById: userId, isPublic: true },
    });
    if (publishedCount < 3) {
      throw new BadRequestException(
        `You need at least 3 published worksheets to apply (currently: ${publishedCount})`,
      );
    }

    // Save bio for review
    await this.prisma.user.update({
      where: { id: userId },
      data: { contributorBio: bio },
    });

    this.logger.log(`Verification application submitted by user ${userId}`);

    return {
      message: 'Verification application submitted. An admin will review your profile.',
      publishedWorksheets: publishedCount,
    };
  }

  /**
   * Admin approves a verified contributor badge.
   */
  async approveVerification(userId: string, moderatorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerifiedContributor: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerifiedContributor) {
      throw new BadRequestException('User is already verified');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerifiedContributor: true,
        verifiedContributorAt: new Date(),
      },
    });

    this.logger.log(
      `User ${userId} verified by moderator ${moderatorId}`,
    );

    return { message: `${user.name} is now a verified contributor` };
  }

  /**
   * Admin revokes a verified contributor badge.
   */
  async revokeVerification(userId: string, moderatorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerifiedContributor: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerifiedContributor) {
      throw new BadRequestException('User is not a verified contributor');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerifiedContributor: false,
        verifiedContributorAt: null,
      },
    });

    this.logger.log(
      `Verification revoked for user ${userId} by moderator ${moderatorId}`,
    );

    return { message: `Verified status removed from ${user.name}` };
  }

  /**
   * Get top contributors leaderboard.
   */
  async getTopContributors(limit = 20) {
    // Find users with most published worksheets that have good ratings
    const contributors = await this.prisma.user.findMany({
      where: {
        worksheets: {
          some: { isPublic: true },
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        isVerifiedContributor: true,
        contributorBio: true,
        _count: {
          select: {
            worksheets: {
              where: { isPublic: true },
            },
          },
        },
      },
      orderBy: {
        worksheets: { _count: 'desc' },
      },
      take: limit,
    });

    // Enrich with aggregate stats
    const enriched = await Promise.all(
      contributors.map(async (c) => {
        const stats = await this.prisma.worksheet.aggregate({
          where: { createdById: c.id, isPublic: true },
          _sum: { cloneCount: true, reviewCount: true },
          _avg: { averageRating: true },
        });

        return {
          id: c.id,
          name: c.name,
          role: c.role,
          isVerifiedContributor: c.isVerifiedContributor,
          bio: c.contributorBio,
          publishedCount: c._count.worksheets,
          totalClones: stats._sum.cloneCount ?? 0,
          totalReviews: stats._sum.reviewCount ?? 0,
          averageRating: stats._avg.averageRating
            ? Math.round(stats._avg.averageRating * 10) / 10
            : null,
        };
      }),
    );

    // Sort by a composite score
    enriched.sort((a, b) => {
      const scoreA =
        a.publishedCount * 10 +
        (a.averageRating ?? 0) * 5 +
        a.totalClones +
        (a.isVerifiedContributor ? 20 : 0);
      const scoreB =
        b.publishedCount * 10 +
        (b.averageRating ?? 0) * 5 +
        b.totalClones +
        (b.isVerifiedContributor ? 20 : 0);
      return scoreB - scoreA;
    });

    return { data: enriched };
  }
}
