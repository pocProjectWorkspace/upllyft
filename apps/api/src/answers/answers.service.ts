// ============================================
// apps/api/src/answers/answers.service.ts
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  CreateAnswerDto,
  UpdateAnswerDto,
  CreateAnswerCommentDto,
  AnswerFiltersDto
} from './dto';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppLoggerService } from '../common/logging';

@Injectable()
export class AnswersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
    private appLogger: AppLoggerService,
  ) {
    this.appLogger.setContext('AnswersService');
  }

  /**
   * Create a new answer with full security
   */
  async create(userId: string, createAnswerDto: CreateAnswerDto) {
    // 1. Check if question exists and is open
    const question = await this.prisma.question.findUnique({
      where: { id: createAnswerDto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.status !== 'OPEN') {
      throw new ForbiddenException('Question is closed');
    }

    // 2. Check if user already answered
    const existingAnswer = await this.prisma.answer.findFirst({
      where: {
        questionId: createAnswerDto.questionId,
        authorId: userId,
      },
    });

    if (existingAnswer) {
      throw new BadRequestException('You have already answered this question');
    }

    // 3. Redact PII/PHI from content (CRITICAL SECURITY)
    const redactedContent = await this.aiService.redactSensitiveInfo(
      createAnswerDto.content
    );

    // 4. Generate embedding for semantic search
    const embedding = await this.aiService.generateEmbedding(redactedContent);

    // 5. Calculate quality score
    const qualityScore = this.calculateAnswerQuality(redactedContent);

    // 6. Moderate content
    const moderation = await this.aiService.moderateHealthContent(redactedContent);

    // 7. Calculate read time and word count
    const wordCount = redactedContent.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200) * 60; // 200 words per minute

    // 8. Generate summary
    const summary = await this.aiService.generatePostSummary(
      redactedContent,
      userId
    );

    // 9. Create answer
    const answer = await this.prisma.answer.create({
      data: {
        questionId: createAnswerDto.questionId,
        authorId: userId,
        content: redactedContent,
        originalContent: redactedContent,
        isAnonymous: createAnswerDto.isAnonymous || false,
        qualityScore,
        embedding,
        summary,
        moderationStatus: moderation.safe ? 'APPROVED' : 'PENDING',
        toxicity: moderation.severity,
        wordCount,
        readTime,
        hasMedia: createAnswerDto.hasMedia || false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            verificationStatus: true,
            expertTopics: true,
            reputation: true,
          },
        },
        question: {
          select: {
            id: true,
            title: true,
            authorId: true,
          },
        },
      },
    });

    // 10. Update question stats
    await this.prisma.question.update({
      where: { id: createAnswerDto.questionId },
      data: {
        answerCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    // 11. Update user stats
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        answerCount: { increment: 1 },
        reputation: { increment: 5 }, // Points for answering
      },
    });

    // 12. Notify question followers (async)
    this.notifyQuestionFollowers(createAnswerDto.questionId, answer.id).catch(err =>
      console.error('Failed to notify followers:', err)
    );

    // 13. Update answer request status if exists
    await this.prisma.answerRequest.updateMany({
      where: {
        questionId: createAnswerDto.questionId,
        requestedUserId: userId,
        status: 'PENDING',
      },
      data: {
        status: 'ANSWERED',
        respondedAt: new Date(),
      },
    });

    // Emit event for question answered
    this.eventEmitter.emit('question.answered', {
      answerId: answer.id,
      questionId: createAnswerDto.questionId,
      authorId: userId,
      questionAuthorId: question.authorId,
      questionTitle: question.title,
    });

    // Log answer creation
    this.appLogger.logQuestion('CREATE_ANSWER', answer.id, userId, {
      questionId: createAnswerDto.questionId,
      isAnonymous: answer.isAnonymous,
    });

    return answer;
  }

  /**
   * Get answers for a question
   */
  async findByQuestion(
    questionId: string,
    userId: string | undefined,
    filters: AnswerFiltersDto
  ) {
    const { page = 1, limit = 20, sort = 'best' } = filters;
    const skip = (page - 1) * limit;

    const orderBy = this.buildSortOrder(sort);

    const [answers, total] = await Promise.all([
      this.prisma.answer.findMany({
        where: {
          questionId,
          moderationStatus: 'APPROVED',
        },
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
              verificationStatus: true,
              expertTopics: true,
              reputation: true,
            },
          },
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.answer.count({
        where: {
          questionId,
          moderationStatus: 'APPROVED',
        },
      }),
    ]);

    // Add user-specific data
    const answersWithUserData = userId
      ? await this.addUserDataToAnswers(answers, userId)
      : answers;

    return {
      answers: answersWithUserData,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update answer
   */
  async update(
    answerId: string,
    userId: string,
    updateAnswerDto: UpdateAnswerDto
  ) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (answer.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own answers');
    }

    // Redact content
    const redactedContent = await this.aiService.redactSensitiveInfo(
      updateAnswerDto.content
    );

    // Re-moderate
    const moderation = await this.aiService.moderateHealthContent(redactedContent);

    // Calculate new metrics
    const wordCount = redactedContent.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200) * 60;

    // Save edit history
    await this.prisma.answerEdit.create({
      data: {
        answerId,
        content: answer.content,
        editReason: updateAnswerDto.editReason,
      },
    });

    // Update answer
    return this.prisma.answer.update({
      where: { id: answerId },
      data: {
        content: redactedContent,
        moderationStatus: moderation.safe ? 'APPROVED' : 'PENDING',
        toxicity: moderation.severity,
        wordCount,
        readTime,
        lastEditedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
      },
    });
  }

  /**
   * Delete answer
   */
  async remove(answerId: string, userId: string, userRole: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
      },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (answer.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own answers');
    }

    await this.prisma.answer.delete({
      where: { id: answerId },
    });

    // Update question answer count
    await this.prisma.question.update({
      where: { id: answer.questionId },
      data: {
        answerCount: { decrement: 1 },
      },
    });

    // Update user answer count
    await this.prisma.user.update({
      where: { id: answer.authorId },
      data: {
        answerCount: { decrement: 1 },
      },
    });
  }

  /**
   * Accept answer (only question author)
   */
  async acceptAnswer(questionId: string, answerId: string, userId: string) {
    // 1. Verify question ownership
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.authorId !== userId) {
      throw new ForbiddenException('Only question author can accept answers');
    }

    // 2. Verify answer belongs to question
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });

    if (!answer || answer.questionId !== questionId) {
      throw new NotFoundException('Answer not found');
    }

    // 3. Unaccept current accepted answer if exists
    if (question.hasAcceptedAnswer && question.acceptedAnswerId) {
      await this.prisma.answer.update({
        where: { id: question.acceptedAnswerId },
        data: {
          isAccepted: false,
          acceptedAt: null,
        },
      });

      // Decrease reputation of previous answer author
      const prevAnswer = await this.prisma.answer.findUnique({
        where: { id: question.acceptedAnswerId },
      });
      if (prevAnswer) {
        await this.prisma.user.update({
          where: { id: prevAnswer.authorId },
          data: {
            reputation: { decrement: 15 },
            acceptedAnswerCount: { decrement: 1 },
          },
        });
      }
    }

    // 4. Accept new answer
    const acceptedAnswer = await this.prisma.answer.update({
      where: { id: answerId },
      data: {
        isAccepted: true,
        acceptedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 5. Update question
    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        hasAcceptedAnswer: true,
        acceptedAnswerId: answerId,
      },
    });

    // 6. Update answer author reputation
    await this.prisma.user.update({
      where: { id: answer.authorId },
      data: {
        reputation: { increment: 15 },
        acceptedAnswerCount: { increment: 1 },
      },
    });

    // 7. Create notification for answer author
    await this.prisma.notification.create({
      data: {
        userId: answer.authorId,
        type: 'ANSWER_ACCEPTED',
        title: 'Answer Accepted',
        message: 'Your answer was accepted!',
        relatedPostId: questionId,
      },
    });

    // Log answer acceptance
    this.appLogger.logQuestion('ACCEPT_ANSWER', answerId, userId, {
      questionId,
      answerAuthorId: answer.authorId,
    });

    return acceptedAnswer;
  }

  /**
   * Vote on answer (helpful/not helpful)
   */
  async voteAnswer(answerId: string, userId: string, value: 1 | -1) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // Check existing vote
    const existingVote = await this.prisma.answerVote.findUnique({
      where: {
        answerId_userId: {
          answerId,
          userId,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === value) {
        // Remove vote
        await this.prisma.answerVote.delete({
          where: {
            answerId_userId: {
              answerId,
              userId,
            },
          },
        });

        // Update answer stats
        await this.prisma.answer.update({
          where: { id: answerId },
          data: {
            helpfulVotes: value === 1 ? { decrement: 1 } : answer.helpfulVotes,
            notHelpfulVotes: value === -1 ? { decrement: 1 } : answer.notHelpfulVotes,
            qualityScore: { decrement: value * 0.5 },
          },
        });

        // Update user reputation
        await this.prisma.user.update({
          where: { id: answer.authorId },
          data: {
            reputation: { decrement: value * 2 },
            helpfulVoteCount: value === 1 ? { decrement: 1 } : undefined,
          },
        });

        return { voted: false };
      } else {
        // Change vote
        await this.prisma.answerVote.update({
          where: {
            answerId_userId: {
              answerId,
              userId,
            },
          },
          data: { value },
        });

        // Update answer stats (net change is 2x)
        await this.prisma.answer.update({
          where: { id: answerId },
          data: {
            helpfulVotes: value === 1 ? { increment: 1 } : { decrement: 1 },
            notHelpfulVotes: value === -1 ? { increment: 1 } : { decrement: 1 },
            qualityScore: { increment: value },
          },
        });

        return { voted: true, value };
      }
    } else {
      // Create new vote
      await this.prisma.answerVote.create({
        data: {
          answerId,
          userId,
          value,
        },
      });

      // Update answer stats
      await this.prisma.answer.update({
        where: { id: answerId },
        data: {
          helpfulVotes: value === 1 ? { increment: 1 } : answer.helpfulVotes,
          notHelpfulVotes: value === -1 ? { increment: 1 } : answer.notHelpfulVotes,
          qualityScore: { increment: value * 0.5 },
        },
      });

      // Update user reputation
      await this.prisma.user.update({
        where: { id: answer.authorId },
        data: {
          reputation: { increment: value * 2 },
          helpfulVoteCount: value === 1 ? { increment: 1 } : undefined,
        },
      });

      return { voted: true, value };
    }
  }

  /**
   * Add comment to answer
   */
  async createComment(
    answerId: string,
    userId: string,
    createCommentDto: CreateAnswerCommentDto
  ) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // Redact PII/PHI
    const redactedContent = await this.aiService.redactSensitiveInfo(
      createCommentDto.content
    );

    return this.prisma.answerComment.create({
      data: {
        answerId,
        authorId: userId,
        content: redactedContent,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
      },
    });
  }

  /**
   * Get answer edit history
   */
  async getEditHistory(answerId: string) {
    return this.prisma.answerEdit.findMany({
      where: { answerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateAnswerQuality(content: string): number {
    let score = 5.0; // Base score

    const wordCount = content.split(/\s+/).length;

    // Length factor
    if (wordCount < 50) score -= 2;
    else if (wordCount < 100) score -= 1;
    else if (wordCount > 500) score += 1;

    // Has structured formatting (paragraphs or lists)
    if (content.includes('\n\n') || content.includes('- ')) {
      score += 0.5;
    }

    // Has references/citations
    const referenceWords = ['study', 'research', 'according', 'source', 'reference'];
    if (referenceWords.some(word => content.toLowerCase().includes(word))) {
      score += 1;
    }

    // Has links
    if (content.includes('http://') || content.includes('https://')) {
      score += 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  private buildSortOrder(sort: string): Prisma.AnswerOrderByWithRelationInput | Prisma.AnswerOrderByWithRelationInput[] {
    switch (sort) {
      case 'best':
        return [
          { isAccepted: 'desc' },
          { qualityScore: 'desc' },
          { helpfulVotes: 'desc' },
        ];
      case 'recent':
        return { createdAt: 'desc' };
      case 'oldest':
        return { createdAt: 'asc' };
      default:
        return [
          { isAccepted: 'desc' },
          { qualityScore: 'desc' },
        ];
    }
  }

  private async addUserDataToAnswers(answers: any[], userId: string) {
    return Promise.all(
      answers.map(async (answer) => {
        const vote = await this.prisma.answerVote.findUnique({
          where: {
            answerId_userId: {
              answerId: answer.id,
              userId,
            },
          },
        });

        return {
          ...answer,
          userVote: vote?.value || null,
        };
      })
    );
  }

  private async notifyQuestionFollowers(questionId: string, answerId: string) {
    const followers = await this.prisma.questionFollower.findMany({
      where: {
        questionId,
        notifyEmail: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        question: {
          select: {
            title: true,
          },
        },
      },
    });

    // Create in-app notifications
    await Promise.all(
      followers.map((follower) =>
        this.prisma.notification.create({
          data: {
            userId: follower.userId,
            type: 'NEW_ANSWER',
            title: 'New Answer',
            message: `New answer on: ${follower.question.title}`,
            relatedPostId: questionId,
          },
        })
      )
    );
  }
}