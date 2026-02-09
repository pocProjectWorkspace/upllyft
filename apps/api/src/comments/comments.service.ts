// apps/api/src/comments/comments.service.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AiService } from '../ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
  ) { }

  async create(userId: string, createCommentDto: CreateCommentDto): Promise<any> {
    const { postId, parentId, content } = createCommentDto;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.isLocked) {
      throw new ForbiddenException('This post is locked and cannot receive new comments');
    }

    // Verify parent comment exists if parentId is provided
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.postId !== postId) {
        throw new ForbiddenException('Parent comment does not belong to this post');
      }
    }

    // Redact PII/PHI if AI is available
    let processedContent = content;
    try {
      processedContent = await this.aiService.redactSensitiveInfo(content);
    } catch (error) {
      this.logger.warn('Failed to redact sensitive info from comment', error);
      processedContent = content;
    }

    // Create comment with only fields that exist in schema
    const comment = await this.prisma.comment.create({
      data: {
        content: processedContent,
        authorId: userId,
        postId,
        parentId,
        // Only include fields that actually exist in your schema
        upvotes: 0,
        downvotes: 0,
        flagged: false,
      },
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
            votes: true,
            replies: true,
          },
        },
      },
    });

    // Update post's updatedAt timestamp
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Emit event for notifications
    this.eventEmitter.emit('comment.created', {
      postId,
      commentId: comment.id,
      authorId: userId,
      content: processedContent,
      parentId,
    });

    return comment;
  }

  async findAllByPost(
    postId: string,
    userId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; meta: any }> {
    const skip = (page - 1) * limit;

    // Get root comments (no parentId)
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
              specialization: true,
              organization: true,
            },
          },
          replies: {
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
              votes: userId ? {
                where: { userId },
                select: { value: true },
              } : false,
              _count: {
                select: {
                  votes: true,
                  replies: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          votes: userId ? {
            where: { userId },
            select: { value: true },
          } : false,
          _count: {
            select: {
              votes: true,
              replies: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentId: null,
        },
      }),
    ]);

    // Calculate upvotes and downvotes for each comment
    const commentsWithVotes = await Promise.all(
      comments.map(async (comment) => {
        // Use existing upvotes/downvotes from comment if available
        const upvotes = comment.upvotes || 0;
        const downvotes = comment.downvotes || 0;

        // Check user's vote
        const userVoteRecord = userId ? await this.prisma.vote.findUnique({
          where: {
            userId_commentId: {
              userId,
              commentId: comment.id,
            },
          },
        }) : null;

        const userVote = userVoteRecord?.value || null;

        // Process replies with votes
        const repliesWithVotes = await Promise.all(
          comment.replies.map(async (reply: any) => {
            const replyUserVote = reply.votes?.[0]?.value || null;

            return {
              ...reply,
              upvotes: reply.upvotes || 0,
              downvotes: reply.downvotes || 0,
              userVote: replyUserVote,
            };
          }),
        );

        return {
          ...comment,
          upvotes,
          downvotes,
          userVote,
          children: repliesWithVotes,
        };
      }),
    );

    return {
      data: commentsWithVotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
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
        post: {
          select: {
            id: true,
            title: true,
            authorId: true,
          },
        },
        _count: {
          select: {
            votes: true,
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<any> {
    const comment = await this.findOne(id);

    // Only author can update their comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Redact PII/PHI if content is being updated
    let processedContent = updateCommentDto.content;
    if (processedContent) {
      try {
        processedContent = await this.aiService.redactSensitiveInfo(processedContent);
      } catch (error) {
        this.logger.warn('Failed to redact sensitive info from comment update', error);
        processedContent = updateCommentDto.content;
      }
    }

    // Update with only existing fields
    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        content: processedContent || undefined,
        updatedAt: new Date(), // This field should exist
      },
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
            votes: true,
            replies: true,
          },
        },
      },
    });

    return updatedComment;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const comment = await this.findOne(id);

    // Check permissions
    const isAuthor = comment.authorId === userId;
    const isAdmin = userRole === 'ADMIN';
    const isModerator = userRole === 'MODERATOR';

    if (!isAuthor && !isAdmin && !isModerator) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // Soft delete - just update content and flag
    await this.prisma.comment.update({
      where: { id },
      data: {
        content: '[This comment has been deleted]',
        flagged: true, // Use existing field
        updatedAt: new Date(),
      },
    });
  }

  async getCommentThread(commentId: string, userId?: string): Promise<any[]> {
    const rootComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
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
      },
    });

    if (!rootComment) {
      throw new NotFoundException('Comment not found');
    }

    // Get all replies recursively
    const replies = await this.getCommentReplies(commentId, userId);

    return [rootComment, ...replies];
  }

  private async getCommentReplies(parentId: string, userId?: string): Promise<any[]> {
    const children = await this.prisma.comment.findMany({
      where: { parentId },
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
        votes: userId ? {
          where: { userId },
          select: { value: true },
        } : false,
        _count: {
          select: {
            votes: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const allReplies: any[] = [];

    for (const child of children) {
      allReplies.push(child);
      const childReplies = await this.getCommentReplies(child.id, userId);
      allReplies.push(...childReplies);
    }

    return allReplies;
  }

  async reportComment(
    commentId: string,
    userId: string,
    reason: string,
    details?: string,
  ): Promise<void> {
    const comment = await this.findOne(commentId);

    // Create moderation report with only existing fields
    await this.prisma.moderationLog.create({
      data: {
        targetId: commentId,
        targetType: 'comment',
        action: 'DELETED',
        reason: reason,
        moderatorId: userId,
        userId: userId, // The reporting user is performing the action
      },
    });

    this.logger.log(`Comment ${commentId} reported by user ${userId} for: ${reason}`);
  }
}