// apps/api/src/votes/votes.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateVoteDto } from './dto/create-vote.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  async createOrUpdate(userId: string, createVoteDto: CreateVoteDto): Promise<any> {
    const { targetId, targetType, value } = createVoteDto;

    // Validate target exists
    await this.validateTarget(targetId, targetType);

    // Build the where clause based on targetType
    let whereClause: any;
    let existingVote: any;

    if (targetType === 'post') {
      // Check for existing post vote
      existingVote = await this.prisma.vote.findUnique({
        where: {
          userId_postId: {
            userId,
            postId: targetId,
          },
        },
      });
    } else {
      // Check for existing comment vote
      existingVote = await this.prisma.vote.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId: targetId,
          },
        },
      });
    }

    if (existingVote) {
      // If same vote value, remove the vote (toggle off)
      if (existingVote.value === value) {
        await this.prisma.vote.delete({
          where: { id: existingVote.id },
        });

        // Update vote counts
        await this.updateTargetVoteCounts(targetId, targetType);

        this.logger.debug(`Vote removed for ${targetType} ${targetId} by user ${userId}`);
        return null;
      }

      // Update existing vote
      const updatedVote = await this.prisma.vote.update({
        where: { id: existingVote.id },
        data: { value },
      });

      // Update vote counts
      await this.updateTargetVoteCounts(targetId, targetType);

      this.logger.debug(`Vote updated for ${targetType} ${targetId} by user ${userId}`);
      return updatedVote;
    }

    // Create new vote
    const voteData: any = {
      userId,
      value,
    };

    // Add the specific relation based on type
    if (targetType === 'post') {
      voteData.postId = targetId;
    } else {
      voteData.commentId = targetId;
    }

    const newVote = await this.prisma.vote.create({
      data: voteData,
    });

    // Update vote counts
    await this.updateTargetVoteCounts(targetId, targetType);

    // Award reputation points
    await this.awardReputationPoints(targetId, targetType, value, userId);

    // Emit event for notifications
    this.eventEmitter.emit('vote.created', {
      targetId,
      targetType,
      voterId: userId,
      value,
    });

    this.logger.debug(`New vote created for ${targetType} ${targetId} by user ${userId}`);
    return newVote;
  }

  async getUserVotes(
    userId: string,
    targetType?: 'post' | 'comment',
  ): Promise<any[]> {
    const where: Prisma.VoteWhereInput = { userId };

    // Filter by type if specified
    if (targetType === 'post') {
      where.postId = { not: null };
      where.commentId = null;
    } else if (targetType === 'comment') {
      where.commentId = { not: null };
      where.postId = null;
    }

    return this.prisma.vote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTargetVotes(targetId: string, targetType: 'post' | 'comment'): Promise<{
    upvotes: number;
    downvotes: number;
    totalVotes: number;
    score: number;
  }> {
    const where: Prisma.VoteWhereInput = {};

    // Set the appropriate ID field based on type
    if (targetType === 'post') {
      where.postId = targetId;
    } else {
      where.commentId = targetId;
    }

    const votes = await this.prisma.vote.findMany({
      where,
      select: {
        value: true,
      },
    });

    const upvotes = votes.filter(v => v.value === 1).length;
    const downvotes = votes.filter(v => v.value === -1).length;

    return {
      upvotes,
      downvotes,
      totalVotes: upvotes + downvotes,
      score: upvotes - downvotes,
    };
  }

  async removeVote(userId: string, targetId: string, targetType: 'post' | 'comment'): Promise<void> {
    let vote: any;

    if (targetType === 'post') {
      vote = await this.prisma.vote.findUnique({
        where: {
          userId_postId: {
            userId,
            postId: targetId,
          },
        },
      });
    } else {
      vote = await this.prisma.vote.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId: targetId,
          },
        },
      });
    }

    if (vote) {
      await this.prisma.vote.delete({
        where: { id: vote.id },
      });

      // Update vote counts
      await this.updateTargetVoteCounts(targetId, targetType);

      this.logger.debug(`Vote removed for ${targetType} ${targetId} by user ${userId}`);
    }
  }

  private async validateTarget(targetId: string, targetType: 'post' | 'comment'): Promise<void> {
    if (targetType === 'post') {
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
      });
      if (!post) {
        throw new BadRequestException('Post not found');
      }
      if (post.isLocked) {
        throw new BadRequestException('Cannot vote on locked posts');
      }
    } else if (targetType === 'comment') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: targetId },
      });
      if (!comment) {
        throw new BadRequestException('Comment not found');
      }
    } else {
      throw new BadRequestException('Invalid target type');
    }
  }

  private async updateTargetVoteCounts(targetId: string, targetType: 'post' | 'comment'): Promise<void> {
    const voteStats = await this.getTargetVotes(targetId, targetType);

    if (targetType === 'post') {
      await this.prisma.post.update({
        where: { id: targetId },
        data: {
          upvotes: voteStats.upvotes,
          downvotes: voteStats.downvotes,
        },
      });
    } else if (targetType === 'comment') {
      // Update comment vote counts
      await this.prisma.comment.update({
        where: { id: targetId },
        data: {
          upvotes: voteStats.upvotes,
          downvotes: voteStats.downvotes,
        },
      });
    }
  }

  private async awardReputationPoints(
    targetId: string,
    targetType: 'post' | 'comment',
    voteValue: number,
    voterId: string,
  ): Promise<void> {
    try {
      let authorId: string;
      let points: number;

      if (targetType === 'post') {
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        if (!post) return;
        authorId = post.authorId;
        points = voteValue === 1 ? 10 : -2; // +10 for upvote, -2 for downvote
      } else {
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        if (!comment) return;
        authorId = comment.authorId;
        points = voteValue === 1 ? 5 : -1; // +5 for upvote, -1 for downvote
      }

      // Don't award points for self-voting
      if (authorId === voterId) {
        return;
      }

      // TODO: Enable reputation system when field is available in Prisma Client
      // For now, just log the points that would be awarded
      this.logger.debug(`Would award ${points} reputation points to user ${authorId}`);

      /* Uncomment when reputation field is available:
      await this.prisma.user.update({
        where: { id: authorId },
        data: {
          reputation: {
            increment: points,
          },
        },
      });
      */
    } catch (error) {
      this.logger.error('Failed to award reputation points', error);
    }
  }

  async getUserUsageStats(userId: string): Promise<any> {
    const [totalVotes, upvotesGiven, downvotesGiven, postsVoted, commentsVoted] = await Promise.all([
      this.prisma.vote.count({ where: { userId } }),
      this.prisma.vote.count({ where: { userId, value: 1 } }),
      this.prisma.vote.count({ where: { userId, value: -1 } }),
      this.prisma.vote.count({ where: { userId, postId: { not: null } } }),
      this.prisma.vote.count({ where: { userId, commentId: { not: null } } }),
    ]);

    return {
      totalVotes,
      upvotesGiven,
      downvotesGiven,
      postsVoted,
      commentsVoted,
    };
  }
}