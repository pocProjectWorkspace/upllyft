import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityRole, MemberStatus } from '@prisma/client';
import { CreateCommunityDto, UpdateCommunityDto } from './dto/community.dto';
import { AppLoggerService } from '../common/logging';

@Injectable()
export class CommunityService {

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private appLogger: AppLoggerService,
  ) {
    this.appLogger.setContext('CommunityService');
  }

  // ==========================================
  // EXISTING METHODS (KEEP AS-IS)
  // ==========================================

  async getCommunityStats() {
    try {
      const [
        totalMembers,
        verifiedProfessionals,
        totalPosts,
        totalComments,
        activeToday,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { verificationStatus: 'VERIFIED' },
        }),
        this.prisma.post.count({
          where: {
            isPublished: true,
            communityId: { not: null }
          },
        }),
        this.prisma.comment.count({
          where: {
            post: {
              communityId: { not: null }
            }
          }
        }),
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        totalMembers,
        verifiedProfessionals,
        totalPosts,
        totalComments,
        activeToday,
      };
    } catch (error) {
      console.error('Error calculating community stats:', error);
      // Return fallback stats to prevent 500
      return {
        totalMembers: 0,
        verifiedProfessionals: 0,
        totalPosts: 0,
        totalComments: 0,
        activeToday: 0,
      };
    }
  }

  async getMembers(query: any) {
    const {
      role,
      verificationStatus,
      search
    } = query;

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role && role !== 'all') {
      where.role = role;
    }

    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          bio: true,
          specialization: true,
          organization: true,
          verificationStatus: true,
          reputation: true,
        },
        orderBy: { reputation: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: members, total };
  }

  async getTopContributors(limit: number) {
    const topContributors = await this.prisma.user.findMany({
      where: { role: { in: ['THERAPIST', 'EDUCATOR'] } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        organization: true,
        specialization: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
      orderBy: [
        { posts: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
      ],
      take: limit,
    });

    return topContributors.map(contributor => ({
      ...contributor,
      _count: {
        posts: contributor._count.posts,
        comments: contributor._count.comments,
        followers: 0,
        following: 0,
      },
    }));
  }

  // ==========================================
  // COMMUNITY MANAGEMENT
  // ==========================================

  async createCommunity(userId: string, dto: CreateCommunityDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    const existing = await this.prisma.community.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException('Community with this slug already exists');
    }

    if (dto.parentId) {
      const parent = await this.prisma.community.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent community not found');
      }
    }

    const community = await this.prisma.community.create({
      data: {
        ...dto,
        slug,
        creatorId: userId,
        organizationId: dto.organizationId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
        parent: true,
      },
    });

    await this.prisma.communityMember.create({
      data: {
        userId,
        communityId: community.id,
        role: CommunityRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });

    await this.prisma.community.update({
      where: { id: community.id },
      data: { memberCount: 1 },
    });

    // Emit event for community creation
    this.eventEmitter.emit('community.created', {
      communityId: community.id,
      creatorId: userId,
      name: community.name,
    });

    return community;
  }

  async findAllCommunities(filters: any = {}, userId?: string) {
    const {
      page = 1,
      limit = 20,
      type,
      condition,
      location,
      search,
      parentId,
      onlyParents = false,
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { isActive: true };

    // Organization filtering logic
    if (userId) {
      // Fetch user's organization memberships
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);

      console.log('🔍 Community Filter - userId:', userId);
      console.log('🔍 Community Filter - user orgIds:', orgIds);

      where.OR = [
        { organizationId: null }, // Generic platform communities
        { organizationId: { in: orgIds } }, // My organization's communities
      ];
    } else {
      // For guests, only show generic platform communities
      where.organizationId = null;
    }

    if (type) where.type = type;
    if (condition) where.condition = condition;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (parentId) where.parentId = parentId;
    if (onlyParents) where.parentId = null;

    if (search) {
      // Wrap search logic in AND to not override OR logic above if present
      const searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      };

      if (where.OR) {
        where.AND = [searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { memberCount: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: {
              members: true,
              posts: true,
              children: true,
              whatsappGroups: true,
            },
          },
        },
      }),
      this.prisma.community.count({ where }),
    ]);

    // Check membership status for each community if userId is provided
    let communitiesWithMembership = communities;
    if (userId) {
      const communityIds = communities.map(c => c.id);
      const userMemberships = await this.prisma.communityMember.findMany({
        where: {
          userId,
          communityId: { in: communityIds },
          status: { in: ['ACTIVE', 'PENDING'] } // Consider active and pending as 'joined' contexts?
        },
        select: {
          communityId: true,
          status: true // Optional: if we want to distinguish pending
        }
      });

      const memberMap = new Set(userMemberships.map(m => m.communityId));

      communitiesWithMembership = communities.map(community => ({
        ...community,
        isMember: memberMap.has(community.id),
      }));
    } else {
      communitiesWithMembership = communities.map(community => ({
        ...community,
        isMember: false,
      }));
    }

    return {
      communities: communitiesWithMembership,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
    };
  }

  async findOneCommunity(idOrSlug: string, userId?: string) {
    // Check if it's an ID (UUID or CUID) or a slug
    // UUID format: 8-4-4-4-12 characters with hyphens
    // CUID format: starts with 'c', 25 characters, alphanumeric
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const isCUID = /^c[a-z0-9]{24}$/i.test(idOrSlug);
    const where = (isUUID || isCUID)
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    const community = await this.prisma.community.findUnique({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        parent: true,
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: { members: true, posts: true },
            },
          },
        },
        whatsappGroups: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            groupLink: true,
            qrCodeUrl: true,
            memberLimit: true,
            currentCount: true,
            isFull: true,
            language: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    let userMembership: any = null;
    if (userId && community) {
      userMembership = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id,
          },
        },
      });
    }

    return {
      ...community,
      userMembership,
    };
  }

  async getCommunityBySlug(slug: string, userId?: string) {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if user is a member and get their role
    let currentUserRole: CommunityRole | null = null;
    let isMember = false;
    let memberStatus: MemberStatus | null = null;

    if (userId) {
      const membership = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id,
          },
        },
      });

      if (membership) {
        isMember = true;
        currentUserRole = membership.role;
        memberStatus = membership.status;
      }
    }

    return {
      ...community,
      isMember,
      currentUserRole,
      memberStatus,
    };
  }

  async updateCommunity(id: string, userId: string, dto: UpdateCommunityDto) {
    await this.checkPermission(id, userId, ['OWNER', 'ADMIN']);

    const community = await this.prisma.community.update({
      where: { id },
      data: dto,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    return community;
  }

  async deleteCommunity(id: string, userId: string) {
    await this.checkPermission(id, userId, ['OWNER']);

    const childrenCount = await this.prisma.community.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete community with sub-communities. Delete sub-communities first.',
      );
    }

    await this.prisma.community.delete({
      where: { id },
    });

    return { message: 'Community deleted successfully' };
  }

  // ==========================================
  // MEMBERSHIP MANAGEMENT
  // ==========================================

  async joinCommunity(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const existing = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (existing) {
      if (existing.status === MemberStatus.ACTIVE) {
        throw new BadRequestException('Already a member of this community');
      }
      if (existing.status === MemberStatus.BANNED) {
        throw new ForbiddenException('You are banned from this community');
      }
    }

    const status = community.requiresApproval
      ? MemberStatus.PENDING
      : MemberStatus.ACTIVE;

    const member = await this.prisma.communityMember.upsert({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      update: {
        status,
        role: CommunityRole.MEMBER,
      },
      create: {
        userId,
        communityId,
        role: CommunityRole.MEMBER,
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (status === MemberStatus.ACTIVE) {
      await this.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      });

      // Emit event for member joined
      this.eventEmitter.emit('community.member.joined', {
        communityId,
        userId,
        role: CommunityRole.MEMBER,
      });
    }

    return member;
  }

  async leaveCommunity(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Not a member of this community');
    }

    if (member.role === CommunityRole.OWNER) {
      throw new BadRequestException('Owner cannot leave community. Transfer ownership first.');
    }

    await this.prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      data: { status: MemberStatus.LEFT },
    });

    if (member.status === MemberStatus.ACTIVE) {
      await this.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      });
    }

    return { message: 'Left community successfully' };
  }

  async getCommunityMembers(communityId: string, filters: any = {}) {
    const { page = 1, limit = 20, role, status = 'ACTIVE' } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { communityId, status };
    if (role) where.role = role;

    const [members, total] = await Promise.all([
      this.prisma.communityMember.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
              bio: true,
            },
          },
          whatsappGroup: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.communityMember.count({ where }),
    ]);

    return {
      members,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    };
  }

  async updateMemberRole(
    communityId: string,
    targetUserId: string,
    role: CommunityRole,
    actorUserId: string,
  ) {
    await this.checkPermission(communityId, actorUserId, ['OWNER', 'ADMIN']);

    const targetMember = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === CommunityRole.OWNER && role !== CommunityRole.OWNER) {
      throw new BadRequestException('Cannot demote owner. Transfer ownership first.');
    }

    const updated = await this.prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
      data: { role },
    });

    return updated;
  }

  async removeMember(communityId: string, targetUserId: string, actorUserId: string) {
    await this.checkPermission(communityId, actorUserId, ['OWNER', 'ADMIN', 'MODERATOR']);

    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === CommunityRole.OWNER) {
      throw new BadRequestException('Cannot remove owner');
    }

    await this.prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
      data: { status: MemberStatus.BANNED },
    });

    if (member.status === MemberStatus.ACTIVE) {
      await this.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      });
    }

    return { message: 'Member removed successfully' };
  }

  async approveMember(communityId: string, targetUserId: string, actorUserId: string) {
    await this.checkPermission(communityId, actorUserId, ['OWNER', 'ADMIN', 'MODERATOR']);

    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.status !== MemberStatus.PENDING) {
      throw new BadRequestException('Member is not pending approval');
    }

    await this.prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
      data: {
        status: MemberStatus.ACTIVE,
        approvedBy: actorUserId,
        approvedAt: new Date(),
      },
    });

    await this.prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });

    return { message: 'Member approved successfully' };
  }

  // 🆕 NEW: Reject member
  async rejectMember(communityId: string, targetUserId: string, actorUserId: string) {
    await this.checkPermission(communityId, actorUserId, ['OWNER', 'ADMIN', 'MODERATOR']);

    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.status !== MemberStatus.PENDING) {
      throw new BadRequestException('Member is not pending approval');
    }

    await this.prisma.communityMember.delete({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId,
        },
      },
    });

    return { message: 'Member request rejected' };
  }

  // 🆕 NEW: Invite user to community
  async inviteUser(communityId: string, inviterId: string, inviteeId: string, message?: string) {
    await this.checkPermission(communityId, inviterId, ['OWNER', 'ADMIN', 'MODERATOR']);

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
    });

    if (!invitee) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: inviteeId,
          communityId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member or has been invited');
    }

    const member = await this.prisma.communityMember.create({
      data: {
        userId: inviteeId,
        communityId,
        role: CommunityRole.MEMBER,
        status: MemberStatus.PENDING,
        invitedBy: inviterId,
        invitedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Emit event for invitation
    this.eventEmitter.emit('community.invite', {
      communityId,
      inviterId,
      inviteeId,
      message,
      communityName: community.name,
    });

    return {
      ...member,
      message: `Invitation sent to ${invitee.name}`,
    };
  }

  async getPendingMembers(communityId: string, actorUserId: string) {
    await this.checkPermission(communityId, actorUserId, ['OWNER', 'ADMIN', 'MODERATOR']);

    const pending = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        status: MemberStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return pending;
  }

  // ==========================================
  // COMMUNITY FEED
  // ==========================================

  async getCommunityPosts(communityId: string, filters: any = {}) {
    const { page = 1, limit = 20, sort = 'recent' } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { upvotes: 'desc' };
    if (sort === 'trending') orderBy = [{ viewCount: 'desc' }, { upvotes: 'desc' }];

    const where: any = {
      communityId,
      isPublished: true,
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
    };
  }

  // 🆕 NEW: Personalized community feed
  async getPersonalizedFeed(communityId: string, userId: string, filters: any = {}) {
    const { page = 1, limit = 20 } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is a member
    const membership = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('You must be an active member to view the personalized feed');
    }

    // Get user's interests from their profile and activity
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { specialization: true, preferences: true },
    });

    // Build personalized feed query
    const where: any = {
      communityId,
      isPublished: true,
    };

    // Filter by user interests if available
    if (user?.specialization && user.specialization.length > 0) {
      where.OR = [
        { tags: { hasSome: user.specialization } },
        { category: { in: user.specialization } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { upvotes: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
    };
  }

  async getUserCommunities(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
      },
      include: {
        community: {
          include: {
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.community,
      userRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  // ==========================================
  // WHATSAPP INTEGRATION
  // ==========================================

  async getWhatsAppGroups(communityId: string) {
    return this.prisma.whatsAppGroup.findMany({
      where: {
        communityId,
        isActive: true
      },
      orderBy: { groupNumber: 'asc' },
    });
  }

  async createWhatsAppGroup(communityId: string, userId: string, dto: any) {
    // Check permissions
    await this.checkPermission(communityId, userId, [CommunityRole.OWNER, CommunityRole.ADMIN]);

    // Get current group count
    const groupCount = await this.prisma.whatsAppGroup.count({
      where: { communityId }
    });

    const community = await this.prisma.community.findUnique({
      where: { id: communityId }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return this.prisma.whatsAppGroup.create({
      data: {
        communityId,
        name: `${community.name} - Group ${groupCount + 1}`,
        description: dto.description,
        groupLink: dto.groupLink, // This should be the actual WhatsApp invite link
        memberLimit: dto.memberLimit || 256,
        language: dto.language || community.primaryLanguage,
        adminUserId: userId,
        groupNumber: groupCount + 1,
        isActive: true,
      },
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async checkPermission(
    communityId: string,
    userId: string,
    allowedRoles: CommunityRole[],
  ) {
    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return member;
  }
}