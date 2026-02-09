// src/events/events.service.ts (in API workspace)

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { MarkInterestDto } from './dto/event-interest.dto';
import { EventStatus, PostType, InterestStatus, MemberStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  // ==========================================
  // CREATE EVENT
  // ==========================================
  async createEvent(userId: string, createEventDto: CreateEventDto) {
    const { communityId, organizationId, shareToFeed, ...eventData } = createEventDto;

    // Validation: Either communityId OR organizationId must be provided
    if (!communityId && !organizationId) {
      throw new BadRequestException('Either communityId or organizationId must be provided');
    }

    if (communityId && organizationId) {
      throw new BadRequestException('Cannot specify both communityId and organizationId');
    }

    // Verify permissions based on event type
    if (communityId) {
      // Community-specific event: verify user is member of community
      const membership = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
      });

      if (!membership || membership.status !== MemberStatus.ACTIVE) {
        throw new ForbiddenException('You must be an active member to create events');
      }
    } else if (organizationId) {
      // Org-wide event: verify user is admin of organization
      const orgMembership = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (!orgMembership || orgMembership.role !== 'ADMIN') {
        throw new ForbiddenException('Only organization admins can create org-wide events');
      }
    }

    // Create event in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the event
      const event = await tx.event.create({
        data: {
          ...eventData,
          communityId: communityId || null,
          organizationId: organizationId || null,
          createdBy: userId,
          status: EventStatus.PUBLISHED,
        },
        include: {
          community: true,
          organization: true,
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // If shareToFeed is true, create a post in the feed
      if (shareToFeed) {
        const post = await tx.post.create({
          data: {
            title: `📅 ${event.title}`,
            content: this.generateEventPostContent(event),
            summary: event.description.substring(0, 200),
            type: PostType.ANNOUNCEMENT,
            category: 'Events',
            tags: [...(event.tags || []), 'event', event.eventType.toLowerCase()],
            authorId: userId,
            communityId: event.isPublic ? null : communityId,
            metadata: {
              eventId: event.id,
              eventType: event.eventType,
              startDate: event.startDate,
              format: event.format,
            },
          },
        });

        // Link the post to the event
        await tx.event.update({
          where: { id: event.id },
          data: { feedPostId: post.id },
        });
      }

      return event;
    });

    // Emit event for event creation
    this.eventEmitter.emit('event.created', {
      eventId: result.id,
      communityId: result.communityId,
      organizationId: result.organizationId,
      creatorId: result.createdBy,
      title: result.title,
      startDate: result.startDate,
    });

    return result;
  }

  // ==========================================
  // UPDATE EVENT
  // ==========================================
  async updateEvent(userId: string, eventId: string, updateEventDto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check permissions (creator or community admin/moderator)
    const canEdit = await this.canEditEvent(userId, event);
    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to edit this event');
    }

    // Handle cancellation
    if (updateEventDto.isCancelled && !event.isCancelled) {
      await this.handleEventCancellation(event, updateEventDto.cancellationReason);
    }

    const result = await this.prisma.event.update({
      where: { id: eventId },
      data: updateEventDto,
      include: {
        community: true,
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        interests: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Emit update event
    this.eventEmitter.emit('event.updated', {
      eventId: eventId,
      communityId: event.communityId,
      title: updateEventDto.title || event.title,
      isCancelled: updateEventDto.isCancelled,
      changes: Object.keys(updateEventDto),
    });

    if (updateEventDto.isCancelled && !event.isCancelled) {
      this.eventEmitter.emit('event.cancelled', {
        eventId: eventId,
        communityId: event.communityId,
        title: event.title,
      });
    }

    return result;
  }

  // ==========================================
  // DELETE EVENT
  // ==========================================
  async deleteEvent(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check permissions
    const canDelete = await this.canDeleteEvent(userId, event);
    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    // Delete associated post if exists
    if (event.feedPostId) {
      await this.prisma.post.delete({
        where: { id: event.feedPostId },
      }).catch(() => {
        // Ignore if post doesn't exist
      });
    }

    await this.prisma.event.delete({
      where: { id: eventId },
    });

    this.eventEmitter.emit('event.deleted', {
      eventId,
      communityId: event.communityId,
      title: event.title,
      creatorId: event.createdBy,
    });

    return { message: 'Event deleted successfully' };
  }

  // ==========================================
  // GET EVENT DETAILS
  // ==========================================
  async getEvent(eventId: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            memberCount: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
        interests: {
          where: {
            status: InterestStatus.GOING,
          },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            interests: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Increment view count
    await this.prisma.event.update({
      where: { id: eventId },
      data: { viewCount: { increment: 1 } },
    });

    // Check user's interest status if logged in
    let userInterest: any = null;
    if (userId) {
      userInterest = await this.prisma.eventInterest.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });
    }

    return {
      ...event,
      userInterest: userInterest?.status || null,
      interestedCount: event._count.interests,
    };
  }

  // ==========================================
  // LIST EVENTS
  // ==========================================
  async listEvents(query: QueryEventsDto, userId?: string) {
    const {
      communityId,
      eventType,
      format,
      city,
      state,
      ageGroup,
      languages,
      startDate,
      endDate,
      search,
      sortBy = 'startDate',
      order = 'asc',
      limit = 20,
      offset = 0,
    } = query;

    const where: any = {
      status: EventStatus.PUBLISHED,
      isCancelled: false,
    };

    // Filter by community
    if (communityId) {
      where.communityId = communityId;
    }

    // Filter by event type
    if (eventType) {
      where.eventType = eventType;
    }

    // Filter by format
    if (format) {
      where.format = format;
    }

    // Filter by location
    if (city) {
      where.city = city;
    }
    if (state) {
      where.state = state;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate);
      }
    }

    // Filter by age group (array overlap)
    if (ageGroup && ageGroup.length > 0) {
      where.ageGroup = {
        hasSome: ageGroup,
      };
    }

    // Filter by languages (array overlap)
    if (languages && languages.length > 0) {
      where.languages = {
        hasSome: languages,
      };
    }

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    // Get events with pagination
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: {
          [sortBy]: order,
        },
        take: limit,
        skip: offset,
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
              verificationStatus: true,
            },
          },
          _count: {
            select: {
              interests: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Get user's interests if logged in
    let userInterests: {
      id: string;
      eventId: string;
      userId: string;
      status: InterestStatus;
      createdAt: Date;
    }[] = [];
    if (userId) {
      const eventIds = events.map((e) => e.id);
      userInterests = await this.prisma.eventInterest.findMany({
        where: {
          userId,
          eventId: { in: eventIds },
        },
      });
    }

    // Map user interests to events
    const eventsWithUserInterest = events.map((event) => {
      const userInterest = userInterests.find((i) => i.eventId === event.id);
      return {
        ...event,
        interestedCount: event._count.interests,
        userInterest: userInterest?.status || null,
      };
    });

    return {
      events: eventsWithUserInterest,
      total,
      hasMore: offset + limit < total,
    };
  }

  // ==========================================
  // MARK INTEREST
  // ==========================================
  async markInterest(userId: string, eventId: string, markInterestDto: MarkInterestDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.isCancelled) {
      throw new BadRequestException('Cannot mark interest in cancelled event');
    }

    // Upsert interest
    const interest = await this.prisma.eventInterest.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      update: {
        status: markInterestDto.status,
      },
      create: {
        eventId,
        userId,
        status: markInterestDto.status,
      },
    });

    // Update interested count
    const interestedCount = await this.prisma.eventInterest.count({
      where: { eventId },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { interestedCount },
    });

    return interest;
  }

  // ==========================================
  // REMOVE INTEREST
  // ==========================================
  async removeInterest(userId: string, eventId: string) {
    const interest = await this.prisma.eventInterest.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    await this.prisma.eventInterest.delete({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    // Update interested count
    const interestedCount = await this.prisma.eventInterest.count({
      where: { eventId },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { interestedCount },
    });

    return { message: 'Interest removed successfully' };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private generateEventPostContent(event: any): string {
    const lines: string[] = [];

    lines.push(`🎯 **${event.title}**`);
    lines.push('');
    lines.push(event.description);
    lines.push('');
    lines.push(`📅 **When:** ${new Date(event.startDate).toLocaleString()}`);

    if (event.format === 'IN_PERSON' || event.format === 'HYBRID') {
      if (event.venue) lines.push(`📍 **Where:** ${event.venue}`);
      if (event.address) lines.push(`📍 **Address:** ${event.address}`);
    }

    if (event.format === 'VIRTUAL' || event.format === 'HYBRID') {
      if (event.platform) lines.push(`💻 **Platform:** ${event.platform}`);
    }

    if (event.ageGroup?.length > 0) {
      lines.push(`👥 **Age Groups:** ${event.ageGroup.join(', ')}`);
    }

    if (event.languages?.length > 0) {
      lines.push(`🗣️ **Languages:** ${event.languages.join(', ')}`);
    }

    if (event.accessibilityFeatures?.length > 0) {
      lines.push(`♿ **Accessibility:** ${event.accessibilityFeatures.join(', ')}`);
    }

    lines.push('');

    if (event.contactEmail || event.contactPhone || event.contactWhatsApp) {
      lines.push('**Contact Information:**');
      if (event.contactEmail) lines.push(`✉️ ${event.contactEmail}`);
      if (event.contactPhone) lines.push(`📞 ${event.contactPhone}`);
      if (event.contactWhatsApp) lines.push(`💬 WhatsApp: ${event.contactWhatsApp}`);
    }

    if (event.externalLink) {
      lines.push('');
      lines.push(`🔗 [More Information](${event.externalLink})`);
    }

    return lines.join('\n');
  }

  private async canEditEvent(userId: string, event: any): Promise<boolean> {
    // Event creator can always edit
    if (event.createdBy === userId) {
      return true;
    }

    // Check if user is admin/moderator of the community
    const membership = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: event.communityId,
        },
      },
    });

    return membership?.role === 'ADMIN' || membership?.role === 'MODERATOR' || membership?.role === 'OWNER';
  }

  private async canDeleteEvent(userId: string, event: any): Promise<boolean> {
    // Event creator can delete
    if (event.createdBy === userId) {
      return true;
    }

    // Check if user is admin/owner of the community
    const membership = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: event.communityId,
        },
      },
    });

    return membership?.role === 'ADMIN' || membership?.role === 'OWNER';
  }

  private async handleEventCancellation(event: any, reason?: string) {
    // Update related feed post if exists
    if (event.feedPostId) {
      await this.prisma.post.update({
        where: { id: event.feedPostId },
        data: {
          title: `❌ [CANCELLED] ${event.title}`,
          content: `**This event has been cancelled.**\n\nReason: ${reason || 'No reason provided'}\n\n---\n\n${event.description}`,
        },
      }).catch(() => {
        // Ignore if post doesn't exist
      });
    }

    // You could add notification logic here for interested users
  }
}