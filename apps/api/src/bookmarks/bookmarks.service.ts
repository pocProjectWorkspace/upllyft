import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarksFilterDto } from './dto/bookmarks-filter.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookmarksService {
  private readonly logger = new Logger(BookmarksService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, createBookmarkDto: CreateBookmarkDto) {
    const { postId, questionId } = createBookmarkDto;

    // Ensure either postId or questionId is provided
    if (!postId && !questionId) {
      throw new Error('Either postId or questionId must be provided');
    }

    try {
      const bookmark = await this.prisma.bookmark.create({
        data: {
          userId,
          postId,
          questionId,
        },
        include: {
          post: true,
          question: true,
        },
      });

      // Emit event for notifications
      if (postId) {
        this.eventEmitter.emit('bookmark.created', {
          postId,
          userId,
        });
        this.logger.debug(`Bookmark created for post ${postId} by user ${userId}`);
      } else {
        this.logger.debug(`Bookmark created for question ${questionId} by user ${userId}`);
      }

      return bookmark;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Already bookmarked');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string, type: 'post' | 'question' = 'post') {
    const whereClause: Prisma.BookmarkWhereInput =
      type === 'post' ? { userId, postId: id } : { userId, questionId: id };

    try {
      const bookmark = await this.prisma.bookmark.deleteMany({
        where: whereClause,
      });

      if (bookmark.count === 0) {
        throw new NotFoundException('Bookmark not found');
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to remove bookmark for ${type} ${id}`, error);
      throw error;
    }
  }

  async findAll(
    userId: string,
    filterDto: BookmarksFilterDto,
  ): Promise<{ data: any[]; meta: any }> {
    const { page = 1, limit = 20, category, type, sortBy = 'createdAt' } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.BookmarkWhereInput = { userId };

    // Add filters if provided
    if (category || type) {
      if (type === 'QUESTION') {
        where.question = {};
        if (category) where.question.category = category;
      } else if (type) {
        where.post = { type: type as any };
        if (category) where.post.category = category;
      } else {
        // If sorting generally with category, we might need more complex logic
        // For now, let's just support simple filtering
        where.OR = [
          { post: category ? { category } : undefined },
          { question: category ? { category } : undefined },
        ];
      }
    }

    // Determine sort order
    let orderBy: Prisma.BookmarkOrderByWithRelationInput = { createdAt: 'desc' };

    // Adjust sorting based on sortBy parameter
    if (sortBy === 'title') {
      // Prioritize post title, this is tricky with mixed types
      orderBy = { post: { title: 'asc' } };
    }

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        include: {
          post: {
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
                  votes: true,
                },
              },
            },
          },
          question: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                },
              },
              _count: {
                select: {
                  answers: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    return {
      data: bookmarks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<any> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        post: {
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
                votes: true,
                bookmarks: true,
              },
            },
          },
        },
        question: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            _count: {
              select: {
                answers: true,
              },
            },
          },
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return bookmark;
  }

  async checkStatus(userId: string, postId?: string, questionId?: string): Promise<boolean> {
    if (!postId && !questionId) return false;

    const where: Prisma.BookmarkWhereInput = { userId };
    if (postId) where.postId = postId;
    if (questionId) where.questionId = questionId;

    const bookmark = await this.prisma.bookmark.findFirst({
      where,
    });

    return !!bookmark;
  }

  async getUserBookmarkStats(userId: string): Promise<{
    total: number;
    byCategory: { category: string; count: number }[];
    byType: { type: string; count: number }[];
    recentBookmarks: any[];
  }> {
    // 1. Get Total Count
    const total = await this.prisma.bookmark.count({
      where: { userId },
    });

    // 2. Get Question Bookmarks Count (Direct DB Count)
    const questionCount = await this.prisma.bookmark.count({
      where: {
        userId,
        questionId: { not: null },
      },
    });

    // 3. Get Post Bookmarks Details
    const postBookmarks = await this.prisma.bookmark.findMany({
      where: {
        userId,
        postId: { not: null },
        questionId: null,
      },
      select: {
        post: {
          select: {
            category: true,
            type: true,
          },
        },
      },
    });

    // Get Question Categories
    const questionBookmarks = await this.prisma.bookmark.findMany({
      where: {
        userId,
        questionId: { not: null },
      },
      select: {
        question: {
          select: {
            category: true,
          },
        },
      },
    });

    // Aggregation Maps
    const categoryMap = new Map<string, number>();
    const typeMap = new Map<string, number>();

    // Add Question Stats
    if (questionCount > 0) {
      typeMap.set('QUESTION', questionCount);

      // Aggregate Question Categories
      questionBookmarks.forEach((b) => {
        if (b.question?.category) {
          categoryMap.set(
            b.question.category,
            (categoryMap.get(b.question.category) || 0) + 1,
          );
        }
      });
    }

    // Add Post Stats
    postBookmarks.forEach((b) => {
      if (b.post) {
        // Category
        const category = b.post.category;
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

        // Type
        let type = b.post.type as string;
        if (type === 'QUESTION') {
          type = 'POST_QUESTION';
        }
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
    });

    const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Get recent bookmarks
    const recentBookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            summary: true,
          },
        },
        question: {
          select: {
            id: true,
            title: true,
            summary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      total,
      byCategory,
      byType,
      recentBookmarks,
    };
  }

  async toggleBookmark(
    userId: string,
    id: string,
    type: 'post' | 'question' = 'post',
  ): Promise<{
    bookmarked: boolean;
    bookmark?: any;
  }> {
    try {
      const whereClause =
        type === 'post'
          ? { userId_postId: { userId, postId: id } }
          : { userId_questionId: { userId, questionId: id } };

      const existingBookmark = await this.prisma.bookmark.findUnique({
        where: whereClause,
      });

      if (existingBookmark) {
        await this.remove(id, userId, type);
        return { bookmarked: false };
      } else {
        const bookmark = await this.create(userId, {
          [type === 'post' ? 'postId' : 'questionId']: id,
        });
        return { bookmarked: true, bookmark };
      }
    } catch (error) {
      this.logger.error(
        `Failed to toggle bookmark for ${type} ${id} by user ${userId}`,
        error,
      );
      throw error;
    }
  }
}