// ============================================
// apps/api/src/questions/questions.service.ts
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
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFiltersDto
} from './dto';
import { Prisma } from '@prisma/client';
import { AppLoggerService } from '../common/logging';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private appLogger: AppLoggerService,
  ) {
    this.appLogger.setContext('QuestionsService');
  }

  /**
   * Create a new question with full security
   */
  async create(userId: string, createQuestionDto: CreateQuestionDto) {
    try {
      console.log('📝 Creating question for user:', userId);

      // 1. Redact PII/PHI from content (CRITICAL SECURITY)
      let redactedContent = createQuestionDto.content;
      try {
        redactedContent = await this.aiService.redactSensitiveInfo(createQuestionDto.content);
      } catch (err) {
        console.warn('⚠️ AI redaction failed, using original content:', err.message);
      }

      // 2. Generate slug from title
      const slug = await this.generateUniqueSlug(createQuestionDto.title);

      // 3. Generate embedding for semantic search (optional, can fail gracefully)
      let embedding: number[] = [];
      try {
        embedding = await this.aiService.generateEmbedding(
          `${createQuestionDto.title} ${redactedContent}`
        );
      } catch (err) {
        console.warn('⚠️ Embedding generation failed:', err.message);
      }

      // 4. Extract topics/tags using AI (optional)
      let aiTags: string[] = [];
      try {
        aiTags = await this.aiService.generateSmartTags(
          redactedContent,
          createQuestionDto.title
        );
      } catch (err) {
        console.warn('⚠️ AI tag generation failed:', err.message);
      }

      // 5. Combine user tags with AI tags
      const allTags = [
        ...(createQuestionDto.tags || []),
        ...aiTags
      ];
      const uniqueTags = [...new Set(allTags)].slice(0, 10);

      // 6. Moderate content (optional)
      let moderationStatus: 'APPROVED' | 'PENDING' = 'APPROVED';
      let needsReview = false;
      try {
        const moderation = await this.aiService.moderateHealthContent(redactedContent);
        moderationStatus = moderation.safe ? 'APPROVED' : 'PENDING';
        needsReview = !moderation.safe;
      } catch (err) {
        console.warn('⚠️ Content moderation failed, auto-approving:', err.message);
      }

      // 7. Generate anonymous name if needed
      const anonymousName = createQuestionDto.isAnonymous
        ? this.generateAnonymousName(userId)
        : null;

      // 8. Generate summary (optional)
      let summary: string | null = null;
      try {
        summary = await this.aiService.generatePostSummary(redactedContent, userId);
      } catch (err) {
        console.warn('⚠️ Summary generation failed:', err.message);
        // Use first 200 chars as fallback
        summary = redactedContent.substring(0, 200) + '...';
      }

      // 9. Create question
      const question = await this.prisma.question.create({
        data: {
          title: createQuestionDto.title,
          content: redactedContent,
          slug,
          authorId: userId,
          isAnonymous: createQuestionDto.isAnonymous || false,
          anonymousName,
          topics: createQuestionDto.topics || [],
          tags: uniqueTags,
          category: createQuestionDto.category || 'General',
          embedding,
          summary,
          moderationStatus,
          needsReview,
          status: 'OPEN',
          lastActivityAt: new Date(),
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
        },
      });

      console.log('✅ Question created:', question.id);

      // 10. Update user question count
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          questionCount: { increment: 1 },
        },
      }).catch(err => console.error('Failed to update user count:', err));

      // 11. Find and link related questions (async, non-blocking)
      this.findAndLinkRelatedQuestions(question.id).catch(err =>
        console.error('Failed to link related questions:', err)
      );

      return question;
    } catch (error) {
      console.error('❌ Error creating question:', error);
      throw new BadRequestException('Failed to create question: ' + error.message);
    }
  }

  /**
   * Get all questions with filters
   */
  async findAll(filters: QuestionFiltersDto, userId?: string) {
    try {
      console.log('🔍 Fetching questions with filters:', filters);

      const {
        page = 1,
        limit = 20,
        status,
        category,
        topics,
        sort = 'recent',
        hasAcceptedAnswer,
        following,
        search,
        authorId,
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.QuestionWhereInput = {
        moderationStatus: 'APPROVED',
        status: status || 'OPEN',
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      if (topics && topics.length > 0) {
        where.topics = { hasSome: topics };
      }

      if (typeof hasAcceptedAnswer === 'boolean') {
        where.hasAcceptedAnswer = hasAcceptedAnswer;
      }

      if (following && userId) {
        where.followers = {
          some: { userId },
        };
      }

      if (authorId) {
        where.authorId = authorId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ];
      }

      console.log('📋 Where clause:', JSON.stringify(where, null, 2));

      // Build orderBy
      const orderBy = this.buildSortOrder(sort);

      // Fetch questions
      const [questions, total] = await Promise.all([
        this.prisma.question.findMany({
          where,
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
                answers: true,
                followers: true,
              },
            },
          },
        }),
        this.prisma.question.count({ where }),
      ]);

      console.log(`✅ Found ${questions.length} questions out of ${total} total`);

      // Add user-specific data
      const questionsWithUserData = userId
        ? await this.addUserDataToQuestions(questions, userId)
        : questions.map(q => ({
          ...q,
          isFollowing: false,
          hasUserAnswered: false,
          isAuthor: false,
        }));

      return {
        questions: questionsWithUserData,
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      throw new BadRequestException('Failed to fetch questions: ' + error.message);
    }
  }

  /**
   * Get single question with all details
   */
  async findOne(id: string, userId?: string) {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              bio: true,
              role: true,
              verificationStatus: true,
              expertTopics: true,
              reputation: true,
            },
          },
          answers: {
            where: {
              moderationStatus: 'APPROVED',
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
              _count: {
                select: {
                  votes: true,
                  comments: true,
                },
              },
            },
            orderBy: [
              { isAccepted: 'desc' },
              { qualityScore: 'desc' },
              { helpfulVotes: 'desc' },
            ],
          },
          relatedQuestions: {
            take: 5,
            include: {
              relatedQuestion: {
                select: {
                  id: true,
                  title: true,
                  answerCount: true,
                  hasAcceptedAnswer: true,
                  viewCount: true,
                },
              },
            },
            orderBy: {
              similarity: 'desc',
            },
          },
          _count: {
            select: {
              answers: true,
              followers: true,
            },
          },
        },
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      // Increment view count (non-blocking)
      this.prisma.question.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(err => console.error('Failed to increment view:', err));

      // Add user-specific data
      if (userId) {
        const [isFollowing, hasAnswered, answerRequests] = await Promise.all([
          this.prisma.questionFollower.findUnique({
            where: {
              questionId_userId: {
                questionId: id,
                userId,
              },
            },
          }),
          this.prisma.answer.findFirst({
            where: {
              questionId: id,
              authorId: userId,
            },
          }),
          this.prisma.answerRequest.findMany({
            where: {
              questionId: id,
              requestedUserId: userId,
              status: 'PENDING',
            },
          }),
        ]);

        return {
          ...question,
          isFollowing: !!isFollowing,
          hasUserAnswered: !!hasAnswered,
          hasAnswerRequest: answerRequests.length > 0,
          isAuthor: question.authorId === userId,
        };
      }

      return {
        ...question,
        isFollowing: false,
        hasUserAnswered: false,
        hasAnswerRequest: false,
        isAuthor: false,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error fetching question:', error);
      throw new BadRequestException('Failed to fetch question: ' + error.message);
    }
  }

  /**
   * Update question
   */
  async update(id: string, userId: string, updateQuestionDto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own questions');
    }

    const updateData: any = { ...updateQuestionDto };

    // Redact content if updated
    if (updateQuestionDto.content) {
      try {
        updateData.content = await this.aiService.redactSensitiveInfo(
          updateQuestionDto.content
        );
      } catch (err) {
        console.warn('⚠️ AI redaction failed during update:', err.message);
        updateData.content = updateQuestionDto.content;
      }

      // Re-moderate
      try {
        const moderation = await this.aiService.moderateHealthContent(updateData.content);
        updateData.moderationStatus = moderation.safe ? 'APPROVED' : 'PENDING';
        updateData.needsReview = !moderation.safe;
      } catch (err) {
        console.warn('⚠️ Moderation failed during update:', err.message);
      }

      // Re-generate embedding (optional)
      try {
        updateData.embedding = await this.aiService.generateEmbedding(
          `${updateQuestionDto.title || question.title} ${updateData.content}`
        );
      } catch (err) {
        console.warn('⚠️ Embedding generation failed during update:', err.message);
      }

      // Re-generate summary (optional)
      try {
        updateData.summary = await this.aiService.generatePostSummary(
          updateData.content,
          userId
        );
      } catch (err) {
        console.warn('⚠️ Summary generation failed during update:', err.message);
      }
    }

    return this.prisma.question.update({
      where: { id },
      data: updateData,
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
      },
    });
  }

  /**
   * Close question
   */
  async closeQuestion(id: string, userId: string, reason: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.authorId !== userId) {
      throw new ForbiddenException('You can only close your own questions');
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedReason: reason,
        closedAt: new Date(),
      },
    });
  }

  /**
   * Delete question
   */
  async remove(id: string, userId: string, userRole: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own questions');
    }

    await this.prisma.question.delete({
      where: { id },
    });

    // Update user question count
    await this.prisma.user.update({
      where: { id: question.authorId },
      data: {
        questionCount: { decrement: 1 },
      },
    }).catch(err => console.error('Failed to update user count:', err));
  }

  /**
   * Follow/Unfollow question
   */
  async toggleFollow(questionId: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const existingFollow = await this.prisma.questionFollower.findUnique({
      where: {
        questionId_userId: {
          questionId,
          userId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await this.prisma.questionFollower.delete({
        where: {
          questionId_userId: {
            questionId,
            userId,
          },
        },
      });

      await this.prisma.question.update({
        where: { id: questionId },
        data: { followerCount: { decrement: 1 } },
      }).catch(() => { });

      return { following: false };
    } else {
      // Follow
      await this.prisma.questionFollower.create({
        data: {
          questionId,
          userId,
          notifyEmail: true,
          notifyPush: true,
        },
      });

      await this.prisma.question.update({
        where: { id: questionId },
        data: { followerCount: { increment: 1 } },
      }).catch(() => { });

      return { following: true };
    }
  }

  /**
   * Get user's followed questions
   */
  async getFollowedQuestions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.questionFollower.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          question: {
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
                  answers: true,
                  followers: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.questionFollower.count({ where: { userId } }),
    ]);

    return {
      questions: follows.map((f) => f.question),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.question.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private generateAnonymousName(userId: string): string {
    const hash = userId.substring(0, 8);
    const adjectives = ['Curious', 'Concerned', 'Caring', 'Thoughtful', 'Wondering'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    return `${adjective} Parent ${hash}`;
  }

  private buildSortOrder(sort: string): Prisma.QuestionOrderByWithRelationInput | Prisma.QuestionOrderByWithRelationInput[] {
    switch (sort) {
      case 'recent':
        return { createdAt: 'desc' };
      case 'active':
        return { lastActivityAt: 'desc' };
      case 'popular':
        return { viewCount: 'desc' };
      case 'unanswered':
        return [{ answerCount: 'asc' }, { createdAt: 'desc' }];
      case 'most-followed':
        return { followerCount: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  private async addUserDataToQuestions(questions: any[], userId: string) {
    return Promise.all(
      questions.map(async (question) => {
        const [isFollowing, userAnswer] = await Promise.all([
          this.prisma.questionFollower.findUnique({
            where: {
              questionId_userId: {
                questionId: question.id,
                userId,
              },
            },
          }),
          this.prisma.answer.findFirst({
            where: {
              questionId: question.id,
              authorId: userId,
            },
          }),
        ]);

        return {
          ...question,
          isFollowing: !!isFollowing,
          hasUserAnswered: !!userAnswer,
          isAuthor: question.authorId === userId,
        };
      })
    );
  }

  private async findAndLinkRelatedQuestions(questionId: string) {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        return;
      }

      // Find similar questions using category matching
      const relatedQuestions = await this.prisma.question.findMany({
        where: {
          id: { not: questionId },
          category: question.category,
          status: 'OPEN',
          moderationStatus: 'APPROVED',
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      // Create relations
      await Promise.all(
        relatedQuestions.map((related) =>
          this.prisma.relatedQuestion.upsert({
            where: {
              questionId_relatedQuestionId: {
                questionId,
                relatedQuestionId: related.id,
              },
            },
            create: {
              questionId,
              relatedQuestionId: related.id,
              similarity: 0.75,
              reason: 'Similar category and topics',
            },
            update: {},
          }).catch(() => { }) // Ignore errors
        )
      );

      console.log(`✅ Linked ${relatedQuestions.length} related questions`);
    } catch (error) {
      console.error('Failed to find related questions:', error);
    }
  }
  /**
   * Get global question stats
   */
  async getQuestionStats() {
    const whereBase: Prisma.QuestionWhereInput = {
      moderationStatus: 'APPROVED',
      status: 'OPEN',
    };

    const [total, answered, unanswered] = await Promise.all([
      // Total OPEN & APPROVED
      this.prisma.question.count({
        where: whereBase,
      }),
      // Answered (Has accepted answer)
      this.prisma.question.count({
        where: {
          ...whereBase,
          hasAcceptedAnswer: true,
        },
      }),
      // Unanswered (No accepted answer)
      this.prisma.question.count({
        where: {
          ...whereBase,
          hasAcceptedAnswer: false,
        },
      }),
    ]);

    return {
      total,
      answered,
      unanswered,
    };
  }
}