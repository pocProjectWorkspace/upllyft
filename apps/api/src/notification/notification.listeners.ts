// apps/api/src/notification/notification.listeners.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService, NotificationType } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationListeners {
  private readonly logger = new Logger(NotificationListeners.name);

  constructor(
    private notificationService: NotificationService,
    private prisma: PrismaService,
  ) { }

  @OnEvent('comment.created')
  async handleCommentCreated(payload: {
    postId: string;
    commentId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: payload.postId },
        include: { author: true },
      });

      if (!post) return;

      // Notify post author (unless they commented themselves)
      if (post.authorId !== payload.authorId) {
        await this.notificationService.createNotification({
          userId: post.authorId,
          type: payload.parentId ? NotificationType.REPLY : NotificationType.COMMENT,
          title: payload.parentId ? 'New reply to your comment' : 'New comment on your post',
          message: `Someone ${payload.parentId ? 'replied to your comment on' : 'commented on'} "${post.title}"`,
          actionUrl: `/posts/${post.id}#comment-${payload.commentId}`,
          relatedEntityId: payload.commentId,
          relatedEntityType: 'comment',
          metadata: {
            postId: post.id,
            commentId: payload.commentId,
            preview: payload.content.substring(0, 100),
          },
        });
      }

      // Handle mentions in the comment
      const mentions = this.extractMentions(payload.content);
      for (const username of mentions) {
        const mentionedUser = await this.prisma.user.findFirst({
          where: ({ username } as any),
        });

        if (mentionedUser && mentionedUser.id !== payload.authorId) {
          await this.notificationService.createNotification({
            userId: mentionedUser.id,
            type: NotificationType.MENTION,
            title: 'You were mentioned',
            message: `@${username} mentioned you in a comment`,
            actionUrl: `/posts/${post.id}#comment-${payload.commentId}`,
            relatedEntityId: payload.commentId,
            relatedEntityType: 'comment',
            priority: 'high',
          });
        }
      }

      this.logger.log(`Processed comment notifications for post ${payload.postId}`);
    } catch (error) {
      this.logger.error('Failed to process comment notifications', error);
    }
  }

  @OnEvent('vote.created')
  async handleVoteCreated(payload: {
    targetId: string;
    targetType: 'post' | 'comment';
    voterId: string;
    value: number;
  }) {
    try {
      // Only notify for upvotes
      if (payload.value !== 1) return;

      if (payload.targetType === 'post') {
        const post = await this.prisma.post.findUnique({
          where: { id: payload.targetId },
          include: { author: true },
        });

        if (post && post.authorId !== payload.voterId) {
          await this.notificationService.createNotification({
            userId: post.authorId,
            type: NotificationType.VOTE,
            title: 'Your post received an upvote',
            message: `Someone upvoted your post "${post.title}"`,
            actionUrl: `/posts/${post.id}`,
            relatedEntityId: post.id,
            relatedEntityType: 'post',
            priority: 'low',
          });
        }
      } else if (payload.targetType === 'comment') {
        const comment = await this.prisma.comment.findUnique({
          where: { id: payload.targetId },
          include: { author: true, post: true },
        });

        if (comment && comment.authorId !== payload.voterId) {
          await this.notificationService.createNotification({
            userId: comment.authorId,
            type: NotificationType.VOTE,
            title: 'Your comment received an upvote',
            message: 'Someone upvoted your comment',
            actionUrl: `/posts/${comment.postId}#comment-${comment.id}`,
            relatedEntityId: comment.id,
            relatedEntityType: 'comment',
            priority: 'low',
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to process vote notification', error);
    }
  }

  @OnEvent('follow.created')
  async handleFollowCreated(payload: {
    followerId: string;
    followingId: string;
  }) {
    try {
      const follower = await this.prisma.user.findUnique({
        where: { id: payload.followerId },
        select: { id: true, name: true, image: true },
      });

      if (follower) {
        await this.notificationService.createNotification({
          userId: payload.followingId,
          type: NotificationType.FOLLOW,
          title: 'New follower',
          message: `${follower.name ?? follower.id} started following you`,
          actionUrl: `/profile/${follower.id}`,
          relatedEntityId: follower.id,
          relatedEntityType: 'user',
          metadata: {
            followerId: follower.id,
            followerName: follower.name,
            followerImage: follower.image,
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to process follow notification', error);
    }
  }

  @OnEvent('bookmark.created')
  async handleBookmarkCreated(payload: {
    postId: string;
    userId: string;
  }) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: payload.postId },
        include: { author: true },
      });

      // Only notify if the post has significant engagement
      const bookmarkCount = await this.prisma.bookmark.count({
        where: { postId: payload.postId },
      });

      if (post && post.authorId !== payload.userId && bookmarkCount % 10 === 0) {
        await this.notificationService.createNotification({
          userId: post.authorId,
          type: NotificationType.BOOKMARK,
          title: 'Milestone reached!',
          message: `Your post "${post.title}" has been bookmarked ${bookmarkCount} times`,
          actionUrl: `/posts/${post.id}`,
          relatedEntityId: post.id,
          relatedEntityType: 'post',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process bookmark notification', error);
    }
  }

  @OnEvent('event.reminder')
  async handleEventReminder(payload: {
    eventId: string;
    reminderType: 'day_before' | 'hour_before' | 'starting_now';
  }) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: payload.eventId },
        include: {
          interests: {
            include: { user: true },
          },
        },
      });

      if (!event) return;

      const message = {
        day_before: `Event "${event.title}" is tomorrow`,
        hour_before: `Event "${event.title}" starts in 1 hour`,
        starting_now: `Event "${event.title}" is starting now!`,
      }[payload.reminderType];

      // Notify all interested users
      for (const interest of event.interests) {
        await this.notificationService.createNotification({
          userId: interest.userId,
          type: NotificationType.EVENT_REMINDER,
          title: 'Event Reminder',
          message,
          actionUrl: `/events/${event.id}`,
          relatedEntityId: event.id,
          relatedEntityType: 'event',
          priority: payload.reminderType === 'starting_now' ? 'high' : 'medium',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process event reminder', error);
    }
  }

  @OnEvent('crisis.detected')
  async handleCrisisDetected(payload: {
    userId: string;
    postId?: string;
    severity: 'low' | 'medium' | 'high';
    keywords: string[];
  }) {
    try {
      // Notify admins and crisis responders
      const admins = await this.prisma.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { specialization: { has: 'crisis_counselor' } },
          ],
        },
      });

      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin.id,
          type: NotificationType.CRISIS_ALERT,
          title: 'Crisis Alert',
          message: `A user may be experiencing a crisis (Severity: ${payload.severity})`,
          actionUrl: payload.postId ? `/posts/${payload.postId}` : `/admin/crisis-alerts`,
          relatedEntityId: payload.userId,
          relatedEntityType: 'user',
          metadata: {
            severity: payload.severity,
            keywords: payload.keywords,
            timestamp: new Date().toISOString(),
          },
          priority: 'urgent',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process crisis alert', error);
    }
  }

  @OnEvent('answer.accepted')
  async handleAnswerAccepted(payload: {
    questionId: string;
    answerId: string;
    answerAuthorId: string;
    questionAuthorId: string;
  }) {
    try {
      const question = await this.prisma.post.findUnique({
        where: { id: payload.questionId },
      });

      if (question && payload.answerAuthorId !== payload.questionAuthorId) {
        await this.notificationService.createNotification({
          userId: payload.answerAuthorId,
          type: NotificationType.ANSWER_ACCEPTED,
          title: 'Your answer was accepted!',
          message: `Your answer to "${question.title}" was marked as the best answer`,
          actionUrl: `/posts/${question.id}#answer-${payload.answerId}`,
          relatedEntityId: payload.answerId,
          relatedEntityType: 'comment',
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process answer accepted notification', error);
    }
  }

  @OnEvent('community.created')
  async handleCommunityCreated(payload: {
    communityId: string;
    creatorId: string;
    name: string;
  }) {
    try {
      await this.notificationService.notifyCommunityCreation(
        payload.communityId,
        payload.creatorId,
        payload.name,
      );
    } catch (error) {
      this.logger.error('Failed to process community created notification', error);
    }
  }

  @OnEvent('community.member.joined')
  async handleCommunityMemberJoined(payload: {
    communityId: string;
    userId: string;
    communityOwnerId: string;
  }) {
    try {
      await this.notificationService.notifyCommunityMemberJoined(
        payload.communityId,
        payload.userId,
        payload.communityOwnerId,
      );
    } catch (error) {
      this.logger.error('Failed to process community member joined notification', error);
    }
  }

  @OnEvent('event.created')
  async handleEventCreated(payload: {
    eventId: string;
    creatorId: string;
    title: string;
    communityId?: string;
  }) {
    try {
      await this.notificationService.notifyEventCreation(
        payload.eventId,
        payload.creatorId,
        payload.title,
        payload.communityId,
      );
    } catch (error) {
      this.logger.error('Failed to process event created notification', error);
    }
  }

  @OnEvent('question.answered')
  async handleQuestionAnswered(payload: {
    questionId: string;
    answerId: string;
    answerAuthorId: string;
  }) {
    try {
      await this.notificationService.notifyQuestionAnswered(
        payload.questionId,
        payload.answerId,
        payload.answerAuthorId,
      );
    } catch (error) {
      this.logger.error('Failed to process question answered notification', error);
    }
  }

  @OnEvent('post.created')
  async handlePostCreated(payload: {
    postId: string;
    authorId: string;
    title: string;
  }) {
    try {
      await this.notificationService.notifyPostCreation(
        payload.postId,
        payload.authorId,
        payload.title,
      );

      // Check for First Post Milestone
      const postCount = await this.prisma.post.count({
        where: { authorId: payload.authorId },
      });

      if (postCount === 1) {
        await this.notificationService.createNotification({
          userId: payload.authorId,
          type: NotificationType.FIRST_POST,
          title: 'First Post!',
          message: 'Congratulations on your first post! Keep sharing.',
          actionUrl: `/posts/${payload.postId}`,
          relatedEntityId: payload.postId,
          relatedEntityType: 'post',
          priority: 'medium',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process post created notification', error);
    }
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  @OnEvent('event.updated')
  async handleEventUpdated(payload: {
    eventId: string;
    communityId: string;
    title: string;
    isCancelled: boolean;
    changes: string[];
  }) {
    try {
      if (payload.isCancelled) return; // Handled by cancelled event

      // Fetch interested users
      const interests = await this.prisma.eventInterest.findMany({
        where: { eventId: payload.eventId },
        select: { userId: true },
      });

      for (const interest of interests) {
        await this.notificationService.createNotification({
          userId: interest.userId,
          type: NotificationType.EVENT_UPDATED,
          title: 'Event Updated',
          message: `The event "${payload.title}" has been updated`,
          actionUrl: `/events/${payload.eventId}`,
          relatedEntityId: payload.eventId,
          relatedEntityType: 'event',
          priority: 'medium',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process event updated notification', error);
    }
  }

  @OnEvent('event.cancelled')
  async handleEventCancelled(payload: {
    eventId: string;
    communityId: string;
    title: string;
  }) {
    try {
      // Fetch interested users
      const interests = await this.prisma.eventInterest.findMany({
        where: { eventId: payload.eventId },
        select: { userId: true },
      });

      for (const interest of interests) {
        await this.notificationService.createNotification({
          userId: interest.userId,
          type: NotificationType.EVENT_CANCELLED,
          title: 'Event Cancelled',
          message: `The event "${payload.title}" has been cancelled`,
          actionUrl: `/events`, // Redirect to events list
          relatedEntityId: payload.eventId,
          relatedEntityType: 'event',
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.error('Failed to process event cancelled notification', error);
    }
  }

  @OnEvent('user.welcome')
  async handleUserWelcome(payload: {
    userId: string;
    name: string;
  }) {
    try {
      await this.notificationService.createNotification({
        userId: payload.userId,
        type: NotificationType.WELCOME,
        title: 'Welcome to Upllyft!',
        message: `Hi ${payload.name}, we're glad you're here.`,
        actionUrl: `/profile/${payload.userId}`,
        priority: 'high',
      });
    } catch (error) {
      this.logger.error('Failed to process welcome notification', error);
    }
  }

  @OnEvent('security.alert')
  async handleSecurityAlert(payload: {
    userId: string;
    type: string;
    message: string;
  }) {
    try {
      await this.notificationService.createNotification({
        userId: payload.userId,
        type: NotificationType.SECURITY_ALERT,
        title: 'Security Alert',
        message: payload.message,
        actionUrl: `/settings/security`,
        priority: 'urgent',
      });
    } catch (error) {
      this.logger.error('Failed to process security alert', error);
    }
  }

  @OnEvent('worksheet.assigned')
  async handleWorksheetAssigned(payload: {
    assignmentId: string;
    worksheetId: string;
    worksheetTitle: string;
    assignedById: string;
    assignedToId: string;
    parentName: string;
    childName: string;
    dueDate?: string;
  }) {
    try {
      const therapist = await this.prisma.user.findUnique({
        where: { id: payload.assignedById },
        select: { name: true },
      });

      const dueDateMsg = payload.dueDate
        ? ` (due ${new Date(payload.dueDate).toLocaleDateString()})`
        : '';

      await this.notificationService.createNotification({
        userId: payload.assignedToId,
        type: NotificationType.WORKSHEET_ASSIGNED,
        title: 'New worksheet assigned',
        message: `${therapist?.name || 'Your therapist'} assigned "${payload.worksheetTitle}" for ${payload.childName}${dueDateMsg}`,
        actionUrl: `/resources/worksheets/assignments/${payload.assignmentId}`,
        relatedEntityId: payload.assignmentId,
        relatedEntityType: 'worksheet',
        priority: 'high',
        metadata: {
          worksheetId: payload.worksheetId,
          assignedById: payload.assignedById,
          childName: payload.childName,
        },
      });

      this.logger.log(
        `Worksheet assignment notification sent to parent ${payload.assignedToId}`,
      );
    } catch (error) {
      this.logger.error('Failed to process worksheet assigned notification', error);
    }
  }

  @OnEvent('worksheet.completed')
  async handleWorksheetCompleted(payload: {
    assignmentId: string;
    worksheetId: string;
    worksheetTitle: string;
    assignedById: string;
    assignedToId: string;
    childName: string;
  }) {
    try {
      const parent = await this.prisma.user.findUnique({
        where: { id: payload.assignedToId },
        select: { name: true },
      });

      await this.notificationService.createNotification({
        userId: payload.assignedById,
        type: NotificationType.WORKSHEET_COMPLETED,
        title: 'Worksheet completed',
        message: `${parent?.name || 'A parent'} completed "${payload.worksheetTitle}" for ${payload.childName}`,
        actionUrl: `/resources/worksheets/assignments/${payload.assignmentId}`,
        relatedEntityId: payload.assignmentId,
        relatedEntityType: 'worksheet',
        priority: 'medium',
        metadata: {
          worksheetId: payload.worksheetId,
          assignedToId: payload.assignedToId,
          childName: payload.childName,
        },
      });

      this.logger.log(
        `Worksheet completion notification sent to therapist ${payload.assignedById}`,
      );
    } catch (error) {
      this.logger.error('Failed to process worksheet completed notification', error);
    }
  }

  @OnEvent('community.invite')
  async handleCommunityInvite(payload: {
    communityId: string;
    inviterId: string;
    inviteeId: string;
    communityName: string;
    message?: string;
  }) {
    try {
      const inviter = await this.prisma.user.findUnique({
        where: { id: payload.inviterId },
        select: { name: true },
      });

      await this.notificationService.createNotification({
        userId: payload.inviteeId,
        type: NotificationType.COMMUNITY_INVITE,
        title: 'Community Invitation',
        message: `${inviter?.name || 'Someone'} invited you to join "${payload.communityName}"`,
        actionUrl: `/community/${payload.communityId}`,
        relatedEntityId: payload.communityId,
        relatedEntityType: 'community', // Note: 'community' might not be in the literal type yet if restricted
        metadata: {
          inviterId: payload.inviterId,
          inviterName: inviter?.name,
          message: payload.message,
        },
        priority: 'medium',
      });
    } catch (error) {
      this.logger.error('Failed to process community invite', error);
    }
  }
}