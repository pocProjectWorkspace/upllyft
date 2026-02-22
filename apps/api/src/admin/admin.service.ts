// apps/api/src/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, ModerationStatus, Prisma } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];
const CREDENTIALS_BUCKET = 'credentials';

@Injectable()
export class AdminService {
  private _supabase: SupabaseClient | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = this.configService.get<string>(
        'NEXT_PUBLIC_SUPABASE_URL',
        '',
      );
      const key = this.configService.get<string>(
        'SUPABASE_SERVICE_ROLE_KEY',
        '',
      );
      if (!url || !key) {
        throw new BadRequestException(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalCommunities,
      totalOrganizations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.community.count({ where: { isActive: true } }),
      this.prisma.organization.count(),
    ]);

    // Active users in last 24 hours
    const activeUsers = await this.prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const pendingVerifications = await this.prisma.user.count({
      where: {
        verificationStatus: 'PENDING',
        role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
      },
    });

    const flaggedContent = await this.prisma.post.count({
      where: { moderationStatus: ModerationStatus.FLAGGED },
    });

    // AI usage - count from AI-related tables if they exist
    const aiUsage = Math.floor(Math.random() * 1000); // Mock for now
    const storageUsed = 45; // Mock percentage

    return {
      totalUsers,
      totalPosts,
      totalComments,
      totalCommunities,
      totalOrganizations,
      activeUsers,
      pendingVerifications,
      flaggedContent,
      aiUsage,
      storageUsed,
    };
  }

  async getCommunityStats() {
    const [
      totalCommunities,
      globalCommunities,
      orgCommunities,
      communitiesLast7Days,
      totalMembers,
    ] = await Promise.all([
      this.prisma.community.count({ where: { isActive: true } }),
      this.prisma.community.count({
        where: { isActive: true, organizationId: null },
      }),
      this.prisma.community.count({
        where: { isActive: true, organizationId: { not: null } },
      }),
      this.prisma.community.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.communityMember.count({ where: { status: 'ACTIVE' } }),
    ]);

    const avgMembersPerCommunity =
      totalCommunities > 0 ? Math.round(totalMembers / totalCommunities) : 0;

    return {
      totalCommunities,
      globalCommunities,
      orgCommunities,
      communitiesLast7Days,
      totalMembers,
      avgMembersPerCommunity,
    };
  }

  async getOrganizationStats() {
    const [totalOrganizations, orgMembers, orgCommunities] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organizationMember.count({ where: { status: 'ACTIVE' } }),
      this.prisma.community.count({
        where: { isActive: true, organizationId: { not: null } },
      }),
    ]);

    const avgMembersPerOrg =
      totalOrganizations > 0 ? Math.round(orgMembers / totalOrganizations) : 0;

    return {
      totalOrganizations,
      orgMembers,
      orgCommunities,
      avgMembersPerOrg,
    };
  }

  async getEngagementStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau, postsLast7Days, commentsLast7Days, totalQuestions] =
      await Promise.all([
        this.prisma.user.count({
          where: { updatedAt: { gte: oneDayAgo } },
        }),
        this.prisma.user.count({
          where: { updatedAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.user.count({
          where: { updatedAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.post.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.comment.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.question.count(),
      ]);

    const totalUsers = await this.prisma.user.count();
    const totalPosts = await this.prisma.post.count();
    const totalComments = await this.prisma.comment.count();

    const avgPostsPerUser = totalUsers > 0 ? (totalPosts / totalUsers).toFixed(2) : '0';
    const avgCommentsPerPost = totalPosts > 0 ? (totalComments / totalPosts).toFixed(2) : '0';
    const dauMauRatio = mau > 0 ? ((dau / mau) * 100).toFixed(1) : '0';

    return {
      dau,
      wau,
      mau,
      postsLast7Days,
      commentsLast7Days,
      totalQuestions,
      avgPostsPerUser: parseFloat(avgPostsPerUser),
      avgCommentsPerPost: parseFloat(avgCommentsPerPost),
      dauMauRatio: parseFloat(dauMauRatio),
    };
  }

  async getContentModerationStats() {
    const [
      pendingVerifications,
      flaggedPosts,
      flaggedComments,
      pendingTherapists,
      pendingEducators,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          verificationStatus: 'PENDING',
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
      this.prisma.post.count({
        where: { moderationStatus: ModerationStatus.FLAGGED },
      }),
      // Comments don't have moderation status, so we'll return 0
      Promise.resolve(0),
      this.prisma.user.count({
        where: { verificationStatus: 'PENDING', role: Role.THERAPIST },
      }),
      this.prisma.user.count({
        where: { verificationStatus: 'PENDING', role: Role.EDUCATOR },
      }),
    ]);

    return {
      pendingVerifications,
      flaggedPosts,
      flaggedComments,
      pendingTherapists,
      pendingEducators,
      totalFlagged: flaggedPosts + flaggedComments,
    };
  }

  async getUserGrowthStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newUsersLast7Days, newUsersLast30Days, verifiedUsers, usersByRole] =
      await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.user.count({
          where: { verificationStatus: 'VERIFIED' },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
      ]);

    const roleDistribution = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      newUsersLast7Days,
      newUsersLast30Days,
      verifiedUsers,
      roleDistribution,
    };
  }

  async getSystemHealthStats() {
    // Mock system health metrics
    // In production, you'd query actual system metrics
    return {
      apiResponseTime: Math.floor(Math.random() * 100) + 50, // ms
      errorRate: (Math.random() * 2).toFixed(2), // percentage
      databaseSize: 1024, // MB (mock)
      mediaStorage: 45, // percentage
      apiQuota: 68, // percentage
      uptime: 99.9, // percentage
    };
  }

  async getFeatureUsageStats() {
    const [
      whatsappGroups,
      eventsCreated,
      resourcesShared,
      providerSearches,
    ] = await Promise.all([
      this.prisma.whatsAppGroup.count({ where: { isActive: true } }),
      this.prisma.event.count(),
      this.prisma.resource.count(),
      // Mock provider searches
      Promise.resolve(Math.floor(Math.random() * 500)),
    ]);

    return {
      whatsappGroups,
      eventsCreated,
      resourcesShared,
      providerSearches,
      clinicalInsights: Math.floor(Math.random() * 200), // Mock
    };
  }

  async getEngagementTrends() {
    // Get data for the last 7 days
    const days = 7;
    const trends: Array<{
      date: string;
      posts: number;
      comments: number;
      questions: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [posts, comments, questions] = await Promise.all([
        this.prisma.post.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.comment.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.question.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      trends.push({
        date: date.toISOString().split('T')[0],
        posts,
        comments,
        questions,
      });
    }

    return trends;
  }

  async getUserDistribution() {
    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    return usersByRole.map((item) => ({
      role: item.role,
      count: item._count,
    }));
  }

  async getAnalytics(range?: string) {
    // Determine date range
    const days = range === '24h' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth over time
    const userGrowth: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      userGrowth.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    // Content stats
    const [totalPosts, totalComments, totalVotes, totalBookmarks] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.vote.count(),
      this.prisma.bookmark.count(),
    ]);

    const contentStats = [
      { type: 'Posts', count: totalPosts },
      { type: 'Comments', count: totalComments },
      { type: 'Votes', count: totalVotes },
      { type: 'Bookmarks', count: totalBookmarks },
    ];

    // Engagement metrics (mock for now)
    const engagementMetrics = [
      { metric: 'Avg. Session Duration', value: 12.5 },
      { metric: 'Pages per Session', value: 4.2 },
      { metric: 'Bounce Rate', value: 32.5 },
      {
        metric: 'Active Users', value: await this.prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        })
      },
    ];

    // AI usage (mock)
    const aiUsage = [
      { feature: 'TL;DR Generation', calls: Math.floor(Math.random() * 3000) },
      { feature: 'Search Embeddings', calls: Math.floor(Math.random() * 6000) },
      { feature: 'Content Moderation', calls: Math.floor(Math.random() * 1000) },
      { feature: 'Resource Suggestions', calls: Math.floor(Math.random() * 2000) },
    ];

    // Top posts
    const topPosts = await this.prisma.post.findMany({
      take: 5,
      orderBy: { viewCount: 'desc' },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    const formattedTopPosts = topPosts.map((post) => ({
      title: post.title,
      views: post.viewCount || 0,
      author: post.author.name || 'Unknown',
    }));

    // Top categories (mock - would need category/tag system)
    const topCategories = [
      { category: 'Autism Spectrum', posts: 234 },
      { category: 'Speech Therapy', posts: 189 },
      { category: 'ADHD', posts: 167 },
    ];

    return {
      userGrowth,
      contentStats,
      engagementMetrics,
      aiUsage,
      topPosts: formattedTopPosts,
      topCategories,
    };
  }

  async getRecentActivity() {
    const recentPosts = await this.prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const activities = [
      ...recentPosts.map((post) => ({
        type: 'post' as const,
        description: `${post.author.name || 'Unknown user'} created a new post: "${post.title}"`,
        time: post.createdAt.toISOString(),
      })),
      ...recentUsers.map((user) => ({
        type: 'user' as const,
        description: `New user registered: ${user.name || user.email}`,
        time: user.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return activities.slice(0, 10);
  }

  // Keep existing methods...
  async getUsers(query: any) {
    const { role, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (status === 'BANNED') {
      where.preferences = {
        path: ['banned'],
        equals: true,
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      ...user,
      lastLoginAt: user.updatedAt,
      status: 'ACTIVE',
    }));
  }

  async updateUserRole(userId: string, newRole: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
  }

  async banUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPreferences = (user?.preferences || {}) as any;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...currentPreferences,
          banned: true,
          bannedAt: new Date().toISOString(),
        },
      },
    });
  }

  async getFlaggedContent(query: any) {
    const flaggedPosts = await this.prisma.post.findMany({
      where: {
        moderationStatus: ModerationStatus.FLAGGED,
      },
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    const recentComments = await this.prisma.comment.findMany({
      take: 5,
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const content = [
      ...flaggedPosts.map((post) => ({
        id: post.id,
        type: 'post' as const,
        preview: post.title.slice(0, 100),
        fullContent: post.content,
        author: post.author.name || post.author.email,
        reason: 'Automated detection',
        severity: 'medium' as const,
        reportedAt: post.updatedAt.toISOString(),
        status: 'pending' as const,
        flaggedBy: 'system' as const,
        aiAnalysis: 'Content flagged for review',
      })),
      ...recentComments.map((comment) => ({
        id: comment.id,
        type: 'comment' as const,
        preview: comment.content.slice(0, 100),
        fullContent: comment.content,
        author: comment.author.name || comment.author.email,
        reason: 'Review needed',
        severity: 'low' as const,
        reportedAt: comment.createdAt.toISOString(),
        status: 'pending' as const,
        flaggedBy: 'system' as const,
        aiAnalysis: null as string | null,
      })),
    ];

    return content;
  }

  async moderateContent(
    contentId: string,
    action: 'approve' | 'remove',
    notes?: string,
  ) {
    if (action === 'approve') {
      try {
        await this.prisma.post.update({
          where: { id: contentId },
          data: {
            moderationStatus: ModerationStatus.APPROVED,
            moderationNotes: notes || null,
          },
        });
      } catch {
        try {
          const comment = await this.prisma.comment.findUnique({
            where: { id: contentId },
          });

          if (!comment) {
            throw new Error('Content not found');
          }

          console.log(`Comment ${contentId} approved`);
        } catch (error) {
          console.error('Failed to approve content:', error);
          throw new Error('Content not found');
        }
      }
    } else {
      try {
        await this.prisma.post.update({
          where: { id: contentId },
          data: {
            moderationStatus: ModerationStatus.REJECTED,
            moderationNotes: notes || null,
            isPublished: false,
          },
        });
      } catch {
        try {
          await this.prisma.comment.delete({
            where: { id: contentId },
          });
        } catch (error) {
          console.error('Failed to remove content:', error);
          throw new Error('Content not found');
        }
      }
    }

    return { success: true, action, notes };
  }

  // ── Therapist Credentials ───────────────────────────────────

  async uploadCredential(
    therapistId: string,
    adminId: string,
    file: Express.Multer.File,
    label: string,
    expiresAt?: string,
  ) {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPEG, and PNG are allowed.',
      );
    }

    const storagePath = `${therapistId}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await this.supabase.storage
      .from(CREDENTIALS_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    return this.prisma.credential.create({
      data: {
        therapistId,
        label,
        fileUrl: storagePath,
        mimeType: file.mimetype,
        fileName: file.originalname,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        uploadedBy: adminId,
      },
    });
  }

  async getTherapistCredentials(therapistId: string) {
    return this.prisma.credential.findMany({
      where: { therapistId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCredentialDownloadUrl(therapistId: string, credId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id: credId },
    });

    if (!credential || credential.therapistId !== therapistId) {
      throw new NotFoundException('Credential not found');
    }

    const { data, error } = await this.supabase.storage
      .from(CREDENTIALS_BUCKET)
      .createSignedUrl(credential.fileUrl, 900); // 15 minutes

    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        `Failed to generate download URL: ${error?.message || 'Unknown error'}`,
      );
    }

    return { url: data.signedUrl, expiresIn: 900 };
  }

  async deleteCredential(therapistId: string, credId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id: credId },
    });

    if (!credential || credential.therapistId !== therapistId) {
      throw new NotFoundException('Credential not found');
    }

    await this.supabase.storage
      .from(CREDENTIALS_BUCKET)
      .remove([credential.fileUrl]);

    await this.prisma.credential.delete({
      where: { id: credId },
    });

    return { success: true };
  }

  // ── PDPL: Right to Access — Data Export ───────────────────────────

  async exportUserData(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        location: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      profile,
      children,
      assessments,
      sessions,
      messages,
      invoices,
      consentForms,
      miraConversations,
    ] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId },
        select: {
          fullName: true,
          relationshipToChild: true,
          phoneNumber: true,
          city: true,
          state: true,
          occupation: true,
          educationLevel: true,
          preferredLanguage: true,
        },
      }),
      this.prisma.child.findMany({
        where: { profile: { userId } },
        include: { conditions: true },
      }),
      this.prisma.assessment.findMany({
        where: { child: { profile: { userId } } },
        select: {
          id: true,
          ageGroup: true,
          status: true,
          overallScore: true,
          flaggedDomains: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.caseSession.findMany({
        where: { case: { child: { profile: { userId } } } },
        select: {
          id: true,
          scheduledAt: true,
          sessionType: true,
          attendanceStatus: true,
          noteStatus: true,
          rawNotes: true,
          structuredNotes: true,
          createdAt: true,
        },
      }),
      this.prisma.message.findMany({
        where: { senderId: userId },
        select: {
          id: true,
          body: true,
          createdAt: true,
          conversationId: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { patientId: userId },
        select: {
          id: true,
          amount: true,
          status: true,
          issuedAt: true,
          paidAt: true,
        },
      }),
      this.prisma.consentForm.findMany({
        where: { patientId: userId },
        select: {
          id: true,
          status: true,
          sentAt: true,
          signedAt: true,
        },
      }),
      this.prisma.miraConversation.findMany({
        where: { userId },
        include: {
          messages: {
            select: { role: true, content: true, createdAt: true },
          },
        },
      }),
    ]);

    // Audit the export
    await this.auditService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: userId,
      action: 'EXPORT',
      metadata: { reason: 'PDPL data access request' },
    });

    return {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      children,
      assessments,
      sessions,
      messages,
      invoices,
      consentForms,
      miraConversations,
    };
  }

  // ── PDPL: Right to Deletion — Anonymise + Soft Delete ─────────────

  async deleteUserData(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const REDACTED = '[deleted]';

    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymise user PII
      await tx.user.update({
        where: { id: userId },
        data: {
          name: REDACTED,
          email: `deleted-${userId}@deleted.upllyft.com`,
          phone: null,
          location: null,
          bio: null,
          image: null,
          password: null,
          emergencyContact: null,
          emergencyPhone: null,
          website: null,
          education: null,
          resetPasswordToken: null,
        },
      });

      // 2. Anonymise user profile
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

      // 3. Anonymise children
      const children = await tx.child.findMany({
        where: { profile: { userId } },
        select: { id: true },
      });
      for (const child of children) {
        await tx.child.update({
          where: { id: child.id },
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
      }

      // 4. Anonymise message bodies
      await tx.message.updateMany({
        where: { senderId: userId },
        data: { body: REDACTED },
      });

      // 5. Anonymise Mira conversation content
      const miraConvos = await tx.miraConversation.findMany({
        where: { userId },
        select: { id: true },
      });
      for (const convo of miraConvos) {
        await tx.miraMessage.updateMany({
          where: { conversationId: convo.id },
          data: { content: REDACTED },
        });
      }
    });

    // Audit the deletion
    await this.auditService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: userId,
      action: 'DELETE',
      metadata: { reason: 'PDPL data deletion request' },
    });

    return { success: true, anonymisedAt: new Date().toISOString() };
  }
}