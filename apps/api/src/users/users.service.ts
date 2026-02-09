// apps/api/src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async getProfileWithStats(userId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        bio: true,
        verificationStatus: true,
        createdAt: true,
        // Only select fields that exist in your current schema
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        organization: true,
        trustScore: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Basic stats calculation
    const stats = {
      posts: user._count.posts,
      comments: user._count.comments,
      questionsAnswered: 0,
      resourcesShared: 0,
      upvotesReceived: 0,
      responseRate: 75,
      followers: 0,
      following: 0,
    };

    // Simple trust score (use existing trustScore from database)
    const trustScore = Math.round(user.trustScore * 100);

    // Simple badges based on existing data
    const badges = this.calculateBadges(user);

    // Get recent posts
    const recentPosts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        createdAt: true,
        upvotes: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      ...user,
      stats,
      trustScore,
      badges,
      recentPosts: recentPosts.map(post => ({
        ...post,
        excerpt: post.content.substring(0, 150) + '...',
        comments: post._count.comments,
      })),
      isFollowing: false, // Will implement when Follow model is ready
    };
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    // Only update fields that exist in current schema
    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.organization !== undefined) updateData.organization = dto.organization;
    if (dto.specialization !== undefined) updateData.specialization = dto.specialization;
    if (dto.yearsOfExperience !== undefined) updateData.yearsOfExperience = dto.yearsOfExperience;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return updated;
  }

  async updateAvatar(userId: string, imageUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });
  }

  async followUser(followerId: string, followingId: string) {
    // Temporarily return mock data until Follow model is migrated
    return {
      message: 'Follow feature will be available after database migration',
      success: false
    };
  }

  async unfollowUser(followerId: string, followingId: string) {
    // Temporarily return mock data until Follow model is migrated
    return {
      message: 'Unfollow feature will be available after database migration',
      success: false
    };
  }

  async getFollowers(userId: string, page: number, limit: number) {
    // Return empty data until Follow model is migrated
    return {
      followers: [],
      total: 0,
      page: 1,
      pages: 0,
    };
  }

  async getFollowing(userId: string, page: number, limit: number) {
    // Return empty data until Follow model is migrated
    return {
      following: [],
      total: 0,
      page: 1,
      pages: 0,
    };
  }

  async getUserContributions(userId: string, type?: string) {
    const contributions: any = {};

    if (!type || type === 'posts') {
      contributions.posts = await this.prisma.post.count({
        where: {
          authorId: userId,
          isPublished: true,
        },
      });
    }

    if (!type || type === 'answers') {
      contributions.answers = await this.prisma.comment.count({
        where: {
          authorId: userId,
          post: { type: 'QUESTION' },
        },
      });
    }

    if (!type || type === 'resources') {
      contributions.resources = await this.prisma.post.count({
        where: {
          authorId: userId,
          type: 'RESOURCE',
          isPublished: true,
        },
      });
    }

    return contributions;
  }

  async getUserActivity(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        upvotes: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(post => ({
      ...post,
      content: post.title,
    }));
  }

  async getUserBadges(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        verificationStatus: true,
        role: true,
        yearsOfExperience: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) return [];

    return this.calculateBadges(user);
  }

  private calculateBadges(user: any): string[] {
    const badges: string[] = [];

    if (user.verificationStatus === 'VERIFIED') {
      badges.push('✅ Verified Professional');
    }

    if (user._count?.posts >= 10) {
      badges.push('✍️ Active Contributor');
    }

    if (user._count?.comments >= 10) {
      badges.push('💡 Helpful Member');
    }

    if (user.role === 'THERAPIST' || user.role === 'EDUCATOR') {
      badges.push('🏥 Healthcare Professional');
    }

    if (user.yearsOfExperience && user.yearsOfExperience >= 5) {
      badges.push('🎖️ Experienced Practitioner');
    }

    return badges;
  }

  async searchUsers(params: any) {
    const { query, role, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
          bio: true,
          verificationStatus: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ===== METHODS REQUIRED BY AUTH SERVICE =====

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({
      where: { googleId },
    });
  }

  async createGoogleUser(data: {
    email: string;
    name: string;
    googleId: string;
    image?: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: 'USER',
        verificationStatus: 'PENDING',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });
  }

  async findByResetToken(resetToken: string) {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: {
          gt: new Date(),
        },
      },
    });
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
                communities: true,
              },
            },
          },
        },
      },
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

}
