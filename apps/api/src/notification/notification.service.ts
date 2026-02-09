
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Role, Prisma } from '@prisma/client';
import axios from 'axios';

export enum NotificationType {
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  VOTE = 'VOTE',
  BOOKMARK = 'BOOKMARK',
  POST_PUBLISHED = 'POST_PUBLISHED',
  POST_CREATED = 'POST_CREATED',
  CRISIS_ALERT = 'CRISIS_ALERT',
  ADMIN_ALERT = 'ADMIN_ALERT',
  EVENT_REMINDER = 'EVENT_REMINDER',
  EVENT_CREATED = 'EVENT_CREATED',
  VERIFICATION_UPDATE = 'VERIFICATION_UPDATE',
  ANSWER_ACCEPTED = 'ANSWER_ACCEPTED',
  QUESTION_ANSWERED = 'QUESTION_ANSWERED',
  COMMUNITY_CREATED = 'COMMUNITY_CREATED',
  COMMUNITY_MEMBER_JOINED = 'COMMUNITY_MEMBER_JOINED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  WELCOME = 'WELCOME',
  SECURITY_ALERT = 'SECURITY_ALERT',
  FIRST_POST = 'FIRST_POST',
  COMMUNITY_INVITE = 'COMMUNITY_INVITE',
  WORKSHEET_ASSIGNED = 'WORKSHEET_ASSIGNED',
  WORKSHEET_COMPLETED = 'WORKSHEET_COMPLETED',
}

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'post' | 'comment' | 'user' | 'event' | 'community' | 'worksheet';
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private io: Server;
  private cloudRunPushUrl: string;
  private notificationApiKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeEmailTransporter();
    // Cloud Run URL for push notifications (no path suffix needed)
    this.cloudRunPushUrl = this.configService.get<string>(
      'CLOUD_RUN_PUSH_URL',
      'https://sendpushnotification-lftzqicm6q-uc.a.run.app'
    );
    this.notificationApiKey = this.configService.get<string>('NOTIFICATION_API_KEY', '');
  }

  setSocketServer(io: Server) {
    this.io = io;
  }

  private initializeEmailTransporter() {
    const emailConfig = {
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

  }

  async createNotification(data: NotificationData) {
    try {
      // Create notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          // NOTE: Fields actionUrl, priority, metadata, relatedEntityId, relatedEntityType 
          // are missing from the current Prisma schema and have been omitted to fix build errors.
          // TODO: Update schema to include these fields or add a metadata JSON column.
          read: false,
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

      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(data.userId);

      // Send real-time notification if connected
      if (this.io) {
        this.io.to(`user:${data.userId}`).emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: data.actionUrl,
          createdAt: notification.createdAt,
          read: false,
          priority: data.priority || 'medium',
        });
      }

      // Send push notification if enabled
      if (preferences.pushEnabled && this.shouldSendPush(data.type, preferences)) {
        await this.sendPushNotification(notification.userId, {
          title: data.title,
          body: data.message,
          data: {
            notificationId: notification.id,
            type: data.type,
            actionUrl: data.actionUrl || '',
          },
        });
      }

      // Emit event for other services
      this.eventEmitter.emit('notification.created', notification);

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  async getUserNotificationPreferences(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    return {
      emailEnabled: preferences?.emailNotifications ?? true,
      pushEnabled: preferences?.pushNotifications ?? false,
      emailDigest: preferences?.notificationFrequency || 'instant',
      notificationTypes: {
        comments: preferences?.notificationTypes?.['comments'] ?? true,
        replies: preferences?.notificationTypes?.['replies'] ?? true,
        mentions: preferences?.notificationTypes?.['mentions'] ?? true,
        follows: preferences?.notificationTypes?.['follows'] ?? true,
        likes: preferences?.notificationTypes?.['likes'] ?? true,
        events: preferences?.notificationTypes?.['events'] ?? true,
      },
    };
  }

  private shouldSendEmail(type: NotificationType, preferences: any): boolean {
    if (preferences.emailDigest === 'never') return false;

    const typeMap = {
      [NotificationType.COMMENT]: preferences.notificationTypes.comments,
      [NotificationType.REPLY]: preferences.notificationTypes.replies,
      [NotificationType.MENTION]: preferences.notificationTypes.mentions,
      [NotificationType.FOLLOW]: preferences.notificationTypes.follows,
      [NotificationType.LIKE]: preferences.notificationTypes.likes,
      [NotificationType.VOTE]: preferences.notificationTypes.likes,
      [NotificationType.EVENT_REMINDER]: preferences.notificationTypes.events,
    };

    // Always send urgent notifications
    if ([NotificationType.CRISIS_ALERT, NotificationType.ADMIN_ALERT].includes(type)) {
      return true;
    }

    return typeMap[type] ?? true;
  }

  private shouldSendPush(type: NotificationType, preferences: any): boolean {
    // Similar logic to email
    return this.shouldSendEmail(type, preferences);
  }

  /**
   * Get FCM tokens for a user
   */
  private async getFcmTokensForUser(userId: string): Promise<string[]> {
    const tokens = await this.prisma.fcmToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        fcmToken: true,
      },
    });

    return tokens.map(t => t.fcmToken);
  }

  /**
   * Send push notification to a user via Cloud Run service
   * Matches the API format: { deviceToken, title, body }
   */
  async sendPushNotification(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
      imageUrl?: string;
    }
  ) {
    try {
      // Get FCM tokens for the user
      const fcmTokens = await this.getFcmTokensForUser(userId);

      if (fcmTokens.length === 0) {
        this.logger.log(`No FCM tokens found for user ${userId}, skipping push notification`);
        return;
      }

      this.logger.log(`Sending push notification to user ${userId} (${fcmTokens.length} devices)`);

      // Send notification to each device token in parallel
      const results = await Promise.allSettled(
        fcmTokens.map(async (deviceToken) => {
          const response = await axios.post(
            this.cloudRunPushUrl,
            {
              deviceToken, // Old field name for compatibility
              title: notification.title,
              body: notification.body,
              data: notification.data || {},
              imageUrl: notification.imageUrl,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.notificationApiKey,
              },
              timeout: 10000,
            }
          );
          return { deviceToken, success: response.data.success };
        })
      );

      // Count successes and failures
      let successCount = 0;
      let failedTokens: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          failedTokens.push(fcmTokens[index]);
        }
      });

      this.logger.log(
        `Push notification sent to user ${userId}: ${successCount}/${fcmTokens.length} successful`
      );

      if (failedTokens.length > 0) {
        this.logger.warn(`${failedTokens.length} tokens failed for user ${userId}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      this.logger.error(`Failed to send push notification to user ${userId}: ${errorMessage}`);
      if (error.response?.data) {
        this.logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
      }
      // Don't throw - push notification failure shouldn't break the flow
    }
  }

  async getNotifications(userId: string, options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options?.unreadOnly) {
      where.read = false;
    }

    if (options?.types && options.types.length > 0) {
      where.type = { in: options.types };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true,
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);
    return result;
  }

  // Notification creation helpers
  async notifyComment(postId: string, commenterId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post || post.authorId === commenterId) return;

    await this.createNotification({
      userId: post.authorId,
      type: NotificationType.COMMENT,
      title: 'New comment on your post',
      message: `Someone commented on "${post.title}"`,
      actionUrl: `/posts/${postId}`,
      relatedEntityId: postId,
      relatedEntityType: 'post',
      metadata: { commenterId, preview: content.substring(0, 100) },
    });
  }

  async notifyMention(mentionedUserId: string, mentionerId: string, context: string, url: string) {
    await this.createNotification({
      userId: mentionedUserId,
      type: NotificationType.MENTION,
      title: 'You were mentioned',
      message: `Someone mentioned you in a ${context}`,
      actionUrl: url,
      metadata: { mentionerId },
      priority: 'high',
    });
  }

  async notifyFollow(followedId: string, followerId: string) {
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });

    await this.createNotification({
      userId: followedId,
      type: NotificationType.FOLLOW,
      title: 'New follower',
      message: `${follower?.name || 'Someone'} started following you`,
      actionUrl: `/profile/${followerId}`,
      relatedEntityId: followerId,
      relatedEntityType: 'user',
    });
  }

  async notifyAdmins(data: {
    type: string;
    message: string;
    userId?: string;
    metadata?: any;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    const notifications = admins.map(admin =>
      this.createNotification({
        userId: admin.id,
        type: NotificationType.ADMIN_ALERT,
        title: 'Admin Alert',
        message: data.message,
        metadata: { ...data.metadata, triggerUserId: data.userId },
        priority: 'urgent',
      }),
    );

    return Promise.all(notifications);
  }

  // Community notifications
  async notifyCommunityCreation(communityId: string, creatorId: string, communityName: string) {
    // Notify followers of the creator
    const followers = await this.prisma.follow.findMany({
      where: { followingId: creatorId },
      select: { followerId: true },
    });

    const notifications = followers.map(follower =>
      this.createNotification({
        userId: follower.followerId,
        type: NotificationType.COMMUNITY_CREATED,
        title: 'New Community Created',
        message: `A new community "${communityName}" has been created`,
        actionUrl: `/community/${communityId}`,
        relatedEntityId: communityId,
        metadata: { creatorId, communityName },
        priority: 'medium',
      }),
    );

    return Promise.all(notifications);
  }

  async notifyCommunityMemberJoined(communityId: string, userId: string, communityOwnerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });

    if (userId !== communityOwnerId) {
      await this.createNotification({
        userId: communityOwnerId,
        type: NotificationType.COMMUNITY_MEMBER_JOINED,
        title: 'New Community Member',
        message: `${user?.name || 'Someone'} joined your community "${community?.name}"`,
        actionUrl: `/community/${communityId}`,
        relatedEntityId: communityId,
        metadata: { userId, userName: user?.name },
      });
    }
  }

  // Event notifications
  async notifyEventCreation(eventId: string, creatorId: string, eventTitle: string, communityId?: string) {
    let targetUserIds: string[] = [];

    if (communityId) {
      // Notify all community members
      const members = await this.prisma.communityMember.findMany({
        where: { communityId },
        select: { userId: true },
      });
      targetUserIds = members.map(m => m.userId).filter(id => id !== creatorId);
    } else {
      // Notify followers of the creator
      const followers = await this.prisma.follow.findMany({
        where: { followingId: creatorId },
        select: { followerId: true },
      });
      targetUserIds = followers.map(f => f.followerId);
    }

    const notifications = targetUserIds.map(userId =>
      this.createNotification({
        userId,
        type: NotificationType.EVENT_CREATED,
        title: 'New Event Created',
        message: `New event: "${eventTitle}"`,
        actionUrl: `/events/${eventId}`,
        relatedEntityId: eventId,
        relatedEntityType: 'event',
        metadata: { creatorId, eventTitle, communityId },
        priority: 'medium',
      }),
    );

    return Promise.all(notifications);
  }

  // Question answer notifications
  async notifyQuestionAnswered(questionId: string, answerId: string, answerAuthorId: string) {
    const question = await this.prisma.post.findUnique({
      where: { id: questionId },
      include: { author: true },
    });

    if (!question || question.authorId === answerAuthorId) return;

    await this.createNotification({
      userId: question.authorId,
      type: NotificationType.QUESTION_ANSWERED,
      title: 'Your question was answered',
      message: `Someone answered your question: "${question.title}"`,
      actionUrl: `/questions/${questionId}#answer-${answerId}`,
      relatedEntityId: answerId,
      relatedEntityType: 'comment',
      metadata: { questionId, answerId, answerAuthorId },
      priority: 'high',
    });
  }

  // Post creation notification
  async notifyPostCreation(postId: string, authorId: string, postTitle: string) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
    });

    const notifications = followers.map(follower =>
      this.createNotification({
        userId: follower.followerId,
        type: NotificationType.POST_CREATED,
        title: 'New Post',
        message: `New post: "${postTitle}"`,
        actionUrl: `/posts/${postId}`,
        relatedEntityId: postId,
        relatedEntityType: 'post',
        metadata: { authorId, postTitle },
      }),
    );

    return Promise.all(notifications);
  }
}