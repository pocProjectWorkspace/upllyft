// apps/api/src/posts/posts.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService, EngagementMetrics } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  PostType,
  Post as PostModel,
  Vote as VoteModel,
  Bookmark as BookmarkModel,
  User as UserModel,
  Comment as CommentModel,
  Prisma
} from '@prisma/client';
import { FeedsService } from 'src/feeds/feeds.service';

// Define interfaces for type safety
interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface PostWithRelations extends PostModel {
  author: Pick<UserModel, 'id' | 'name' | 'email' | 'image' | 'role' | 'verificationStatus'>;
  _count: {
    comments: number;
    bookmarks: number;
  };
}

interface PostWithUserData extends PostWithRelations {
  commentCount: number;
  bookmarkCount: number;
  userVote: number | null;
  isBookmarked: boolean;
  trendingScore?: number;
}

@Controller('posts')
export class PostsController {
  constructor(
    private prisma: PrismaService,
    private postsService: PostsService,
    private feedsService: FeedsService,
  ) { }

  // ========================================
  // 🆕 ENHANCED PERSONALIZED ENDPOINTS
  // ========================================

  /**
   * Get personalized feed with enhanced filtering and algorithm weights
   * Endpoint: GET /posts/personalized
   */
  @Get('personalized')
  @UseGuards(JwtAuthGuard)
  async getPersonalizedFeed(
    @Request() req: AuthRequest,
    @Query() query: any
  ): Promise<any> {
    const {
      page = '1',
      limit = '10',
      // Preference-based filters
      categories,
      excludeCategories,
      tags,
      excludeTags,
      types,
      excludeKeywords,
      excludeAuthors,
      verifiedOnly,
      minEngagement,
      // Algorithm weights
      weights,
      // Search
      search,
      // Time filters
      timeRange,
      dateFrom,
      dateTo,
    } = query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where: any = {
        isPublished: true,
        moderationStatus: 'APPROVED',
      };

      // Apply included categories
      if (categories) {
        const categoryList = categories.split(',').filter(Boolean);
        if (categoryList.length > 0) {
          where.category = { in: categoryList };
        }
      }

      // Apply excluded categories
      if (excludeCategories) {
        const excludeList = excludeCategories.split(',').filter(Boolean);
        if (excludeList.length > 0) {
          if (where.category?.in) {
            // If we have included categories, filter them
            where.category.in = where.category.in.filter(
              (cat: string) => !excludeList.includes(cat)
            );
          } else {
            // Otherwise exclude these categories
            where.category = { notIn: excludeList };
          }
        }
      }

      // Apply included tags
      if (tags) {
        const tagList = tags.split(',').filter(Boolean);
        if (tagList.length > 0) {
          where.tags = { hasSome: tagList };
        }
      }

      // Apply excluded tags
      if (excludeTags) {
        const excludeTagList = excludeTags.split(',').filter(Boolean);
        if (excludeTagList.length > 0) {
          where.NOT = where.NOT || [];
          where.NOT.push({ tags: { hasSome: excludeTagList } });
        }
      }

      // Apply content types
      if (types) {
        const typeList = types.split(',').filter(Boolean);
        if (typeList.length > 0) {
          where.type = { in: typeList };
        }
      }

      // Apply verified authors filter
      if (verifiedOnly === 'true' || verifiedOnly === true) {
        where.author = {
          verificationStatus: 'VERIFIED',
        };
      }

      // Apply minimum engagement
      if (minEngagement && parseInt(minEngagement) > 0) {
        where.upvotes = { gte: parseInt(minEngagement) };
      }

      // Apply excluded authors
      if (excludeAuthors) {
        const excludeAuthorList = excludeAuthors.split(',').filter(Boolean);
        if (excludeAuthorList.length > 0) {
          if (where.author) {
            where.author.id = { notIn: excludeAuthorList };
          } else {
            where.author = { id: { notIn: excludeAuthorList } };
          }
        }
      }

      // Apply time filters
      if (timeRange || dateFrom || dateTo) {
        where.createdAt = {};

        if (timeRange === '24h') {
          where.createdAt.gte = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (timeRange === 'week') {
          where.createdAt.gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'month') {
          where.createdAt.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // Apply search
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Parse weights for scoring
      let algorithmWeights = {
        recency: 0.3,
        relevance: 0.4,
        engagement: 0.3,
      };

      if (weights) {
        try {
          const parsedWeights = JSON.parse(weights);
          algorithmWeights = {
            recency: (parsedWeights.recency || 30) / 100,
            relevance: (parsedWeights.relevance || 40) / 100,
            engagement: (parsedWeights.engagement || 30) / 100,
          };
        } catch (e) {
          console.error('Failed to parse weights:', e);
        }
      }

      // Fetch posts
      const posts = await this.prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
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
        orderBy: [
          { createdAt: 'desc' }
        ],
      });

      // Score posts based on algorithm weights
      const scoredPosts = posts.map(post => {
        const recencyScore = this.calculateRecencyScore(post.createdAt);
        const engagementScore = this.calculateEngagementScore(
          post.upvotes,
          post.viewCount,
          post._count.comments
        );
        const relevanceScore = this.calculateRelevanceScore(
          post,
          req.user.id,
          categories?.split(',') || []
        );

        const totalScore =
          (recencyScore * algorithmWeights.recency) +
          (engagementScore * algorithmWeights.engagement) +
          (relevanceScore * algorithmWeights.relevance);

        return {
          ...post,
          score: totalScore,
        };
      });

      // Sort by score
      scoredPosts.sort((a, b) => b.score - a.score);

      // Check user interactions
      const postsWithUserData = await Promise.all(
        scoredPosts.map(async (post) => {
          const [userVote, isBookmarked] = await Promise.all([
            this.prisma.vote.findFirst({
              where: {
                postId: post.id,
                userId: req.user.id,
              },
            }),
            this.prisma.bookmark.findFirst({
              where: {
                postId: post.id,
                userId: req.user.id,
              },
            }),
          ]);

          // Remove score from response
          const { score, ...postWithoutScore } = post;

          return {
            ...postWithoutScore,
            userVote: userVote?.value || null,
            isBookmarked: !!isBookmarked,
          };
        })
      );

      // Get total count for pagination
      const totalCount = await this.prisma.post.count({ where });

      return {
        posts: postsWithUserData,
        meta: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: totalCount > skip + parseInt(limit),
        },
      };
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      throw new HttpException(
        'Failed to get personalized feed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get similar users for collaborative filtering
   * Endpoint: GET /posts/similar-users
   */
  @Get('similar-users')
  @UseGuards(JwtAuthGuard)
  async getSimilarUsers(@Request() req: AuthRequest) {
    try {
      const similarUserIds = await this.postsService.findSimilarUsers(
        req.user.id,
        10
      );

      // Get user details for the similar users
      const users = await this.prisma.user.findMany({
        where: { id: { in: similarUserIds } },
        select: {
          id: true,
          name: true,
          role: true,
          specialization: true,
          verificationStatus: true,
          _count: {
            select: {
              posts: true,
              followers: true,
            },
          },
        },
      });

      return users;
    } catch (error) {
      console.error('Error getting similar users:', error);
      throw new HttpException('Failed to get similar users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get trending posts with velocity metrics
   * Endpoint: GET /posts/trending-with-velocity
   */
  @Get('trending-with-velocity')
  @UseGuards(JwtAuthGuard)
  async getTrendingWithVelocity(@Query() query: any) {
    const { limit = '10', timeRange = '24h' } = query;

    try {
      // Get trending posts
      const posts = await this.prisma.post.findMany({
        where: {
          isPublished: true,
          createdAt: {
            gte: this.getTimeRangeDate(timeRange),
          },
        },
        orderBy: [
          { upvotes: 'desc' },
          { viewCount: 'desc' },
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
        take: parseInt(limit) * 2, // Get extra for velocity filtering
      });

      // Calculate velocity for each post
      const postsWithVelocity = await Promise.all(
        posts.map(async (post) => {
          const velocity = await this.postsService.calculateEngagementVelocity(
            post.id,
            '24h'
          );
          return {
            ...post,
            velocity,
          };
        })
      );

      // Filter to only rising trends and sort by velocity
      const risingPosts = postsWithVelocity
        .filter(p => p.velocity.trend === 'rising')
        .sort((a, b) => b.velocity.velocity - a.velocity.velocity)
        .slice(0, parseInt(limit));

      return {
        posts: risingPosts,
        meta: {
          timeRange,
          count: risingPosts.length,
        },
      };
    } catch (error) {
      console.error('Error getting trending with velocity:', error);
      throw new HttpException('Failed to get trending posts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========================================
  // EXISTING ENDPOINTS (UNCHANGED)
  // ========================================

  // Create a new post
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthRequest,
    @Body() createPostDto: CreatePostDto
  ) {
    try {
      // Log for debugging (no PII)
      console.log('Creating post for user:', req.user?.id);

      // Call the posts service to create the post
      const post = await this.postsService.create(req.user.id, createPostDto);

      return post;
    } catch (error) {
      console.error('Error creating post:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create post',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get all posts with filters
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPosts(@Query() query: any, @Request() req: AuthRequest) {
    const {
      page = '1',
      limit = '10',
      type,
      category,
      sort = 'recent',
      search
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.PostWhereInput = {
      isPublished: true,
    };

    // Apply view-based filters
    if (req.user) {
      if ((query.view as string) === 'saved') {
        where.bookmarks = {
          some: {
            userId: req.user.id,
          },
        };
      } else if ((query.view as string) === 'following') {
        where.author = {
          followers: {
            some: {
              followerId: req.user.id,
            },
          },
        };
      }
    }

    // Add filters
    const types = query.types || query.type;
    if (types && types !== 'all') {
      const typeList = (types as string).split(',').filter(t => t.trim().length > 0) as PostType[];
      if (typeList.length > 0) {
        where.type = { in: typeList };
      }
    }

    const categories = query.categories || query.category;
    if (categories && categories !== 'all') {
      const categoryList = (categories as string).split(',').filter(c => c.trim().length > 0);
      if (categoryList.length > 0) {
        where.category = { in: categoryList };
      }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    let orderBy: Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { upvotes: 'desc' };
    } else if (sort === 'trending') {
      orderBy = [
        { viewCount: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'desc' }
      ];
    }

    try {
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

      // Add user-specific data if authenticated
      const postsWithUserData = await Promise.all(
        posts.map(async (post): Promise<PostWithUserData> => {
          const [userVote, isBookmarked] = await Promise.all([
            this.prisma.vote.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
            this.prisma.bookmark.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
          ]);

          return {
            ...post,
            commentCount: post._count.comments,
            bookmarkCount: post._count.bookmarks,
            userVote: userVote?.value || null,
            isBookmarked: !!isBookmarked,
          };
        })
      );

      return {
        posts: postsWithUserData,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new HttpException('Failed to fetch posts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get trending posts
  @Get('trending')
  @UseGuards(JwtAuthGuard)
  async getTrendingPosts(@Query() query: any, @Request() req: AuthRequest) {
    const { period = '7d', limit = '20' } = query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate = new Date('2020-01-01'); // all time
    }

    const where: Prisma.PostWhereInput = {
      isPublished: true,
      createdAt: {
        gte: startDate,
      },
    };

    try {
      const posts = await this.prisma.post.findMany({
        where,
        orderBy: [
          { viewCount: 'desc' },
          { upvotes: 'desc' },
          { createdAt: 'desc' },
        ],
        take: parseInt(limit),
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
      });

      // Add user-specific data and trending score
      const postsWithData = await Promise.all(
        posts.map(async (post, index): Promise<PostWithUserData> => {
          const [userVote, isBookmarked] = await Promise.all([
            this.prisma.vote.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
            this.prisma.bookmark.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
          ]);

          // Calculate trending score
          const ageInHours = (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
          const trendingScore = (post.upvotes * 2 + post.viewCount) / Math.pow(ageInHours + 2, 1.5);

          return {
            ...post,
            commentCount: post._count.comments,
            bookmarkCount: post._count.bookmarks,
            userVote: userVote?.value || null,
            isBookmarked: !!isBookmarked,
            trendingScore: Math.round(trendingScore * 100),
          };
        })
      );

      // Sort by trending score
      postsWithData.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));

      return postsWithData;
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      throw new HttpException('Failed to fetch trending posts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get questions
  @Get('questions')
  @UseGuards(JwtAuthGuard)
  async getQuestions(@Query() query: any, @Request() req: AuthRequest) {
    const {
      page = '1',
      limit = '20',
      status = 'all',
      sort = 'newest'
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.PostWhereInput = {
      type: PostType.QUESTION,
      isPublished: true,
    };

    // Filter by answered/unanswered status
    if (status === 'answered') {
      where.comments = { some: {} };
    } else if (status === 'unanswered') {
      where.comments = { none: {} };
    }

    // Determine sort order
    let orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { upvotes: 'desc' };
    }

    try {
      const [questions, total] = await Promise.all([
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

      // Add user-specific data
      const questionsWithData = await Promise.all(
        questions.map(async (post): Promise<PostWithUserData> => {
          const [userVote, isBookmarked] = await Promise.all([
            this.prisma.vote.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
            this.prisma.bookmark.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
          ]);

          return {
            ...post,
            commentCount: post._count.comments,
            bookmarkCount: post._count.bookmarks,
            userVote: userVote?.value || null,
            isBookmarked: !!isBookmarked,
          };
        })
      );

      return {
        posts: questionsWithData,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
      };
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw new HttpException('Failed to fetch questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get resources
  @Get('resources')
  @UseGuards(JwtAuthGuard)
  async getResources(@Query() query: any, @Request() req: AuthRequest) {
    const {
      page = '1',
      limit = '12',
      category,
      search
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.PostWhereInput = {
      type: PostType.RESOURCE,
      isPublished: true,
    };

    // Add filters
    if (category && category !== 'all') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    try {
      const [resources, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
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

      // Add user-specific data
      const resourcesWithData = await Promise.all(
        resources.map(async (post): Promise<PostWithUserData> => {
          const [userVote, isBookmarked] = await Promise.all([
            this.prisma.vote.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
            this.prisma.bookmark.findUnique({
              where: {
                userId_postId: {
                  postId: post.id,
                  userId: req.user.id,
                },
              },
            }),
          ]);

          return {
            ...post,
            commentCount: post._count.comments,
            bookmarkCount: post._count.bookmarks,
            userVote: userVote?.value || null,
            isBookmarked: !!isBookmarked,
          };
        })
      );

      return {
        posts: resourcesWithData,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
      };
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw new HttpException('Failed to fetch resources', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get trending tags
  @Get('tags/trending')
  async getTrendingTags(@Query('limit') limit = '10') {
    try {
      const posts = await this.prisma.post.findMany({
        where: { isPublished: true },
        select: { tags: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      // Count tag occurrences
      const tagCounts: Record<string, number> = {};
      posts.forEach(post => {
        post.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Sort and return top tags
      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, parseInt(limit))
        .map(([tag, count]) => ({ tag, count }));

      return sortedTags;
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      return [];
    }
  }

  // Get categories with counts
  @Get('categories')
  async getCategories() {
    try {
      const categories = await this.prisma.post.groupBy({
        by: ['category'],
        where: { isPublished: true },
        _count: true,
      });

      return categories.map(cat => ({
        category: cat.category,
        count: cat._count,
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get engagement velocity for a specific post
   * Endpoint: GET /posts/:id/velocity
   */
  @Get(':id/velocity')
  @UseGuards(JwtAuthGuard)
  async getPostVelocity(@Param('id') id: string) {
    try {
      return await this.postsService.calculateEngagementVelocity(id, '24h');
    } catch (error) {
      console.error('Error getting post velocity:', error);
      throw new HttpException('Failed to get post velocity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get single post by ID - MUST BE LAST (after all specific routes)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPost(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      const post = await this.prisma.post.findUnique({
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
              specialization: true,
              organization: true,
            },
          },
          comments: {
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
              votes: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          votes: true,
          bookmarks: true,
          _count: {
            select: {
              comments: true,
              votes: true,
              bookmarks: true,
            },
          },
        },
      });

      if (!post) {
        throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
      }

      // Increment view count
      await this.prisma.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      // Get user-specific data
      const [userVote, isBookmarked] = await Promise.all([
        this.prisma.vote.findUnique({
          where: {
            userId_postId: {
              postId: id,
              userId: req.user.id,
            },
          },
        }),
        this.prisma.bookmark.findUnique({
          where: {
            userId_postId: {
              postId: id,
              userId: req.user.id,
            },
          },
        }),
      ]);

      // Process comments to add user vote info
      const commentsWithVotes = await Promise.all(
        post.comments.map(async (comment) => {
          const userCommentVote = await this.prisma.vote.findUnique({
            where: {
              userId_commentId: {
                commentId: comment.id,
                userId: req.user.id,
              },
            },
          });

          return {
            ...comment,
            upvotes: comment.votes.filter(v => v.value === 1).length,
            downvotes: comment.votes.filter(v => v.value === -1).length,
            userVote: userCommentVote?.value || null,
          };
        })
      );

      return {
        ...post,
        comments: commentsWithVotes,
        userVote: userVote?.value || null,
        isBookmarked: !!isBookmarked,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching post:', error);
      throw new HttpException('Failed to fetch post', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Vote on a post
  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  async votePost(
    @Param('id') id: string,
    @Body() body: { value: number },
    @Request() req: AuthRequest
  ) {
    const { value } = body;
    const userId = req.user.id;

    try {
      // First check if vote exists
      const existingVote = await this.prisma.vote.findUnique({
        where: {
          userId_postId: {
            postId: id,
            userId,
          },
        },
      });

      if (value === 0) {
        // Remove vote if it exists
        if (existingVote) {
          await this.prisma.vote.delete({
            where: {
              userId_postId: {
                postId: id,
                userId,
              },
            },
          });

          // Update post vote counts
          if (existingVote.value === 1) {
            await this.prisma.post.update({
              where: { id },
              data: { upvotes: { decrement: 1 } },
            });
          } else if (existingVote.value === -1) {
            await this.prisma.post.update({
              where: { id },
              data: { downvotes: { decrement: 1 } },
            });
          }
        }
      } else {
        // Handle vote changes
        if (existingVote) {
          // Update existing vote
          if (existingVote.value !== value) {
            await this.prisma.vote.update({
              where: {
                userId_postId: {
                  postId: id,
                  userId,
                },
              },
              data: { value },
            });

            // Update post counts
            if (existingVote.value === 1 && value === -1) {
              await this.prisma.post.update({
                where: { id },
                data: {
                  upvotes: { decrement: 1 },
                  downvotes: { increment: 1 }
                },
              });
            } else if (existingVote.value === -1 && value === 1) {
              await this.prisma.post.update({
                where: { id },
                data: {
                  upvotes: { increment: 1 },
                  downvotes: { decrement: 1 }
                },
              });
            }
          }
        } else {
          // Create new vote
          await this.prisma.vote.create({
            data: {
              postId: id,
              userId: userId,
              value: value,
              targetId: id,     // Add this line
              targetType: 'post',   // Add this line
            },
          });

          // Update post vote counts
          if (value === 1) {
            await this.prisma.post.update({
              where: { id },
              data: { upvotes: { increment: 1 } },
            });
          } else if (value === -1) {
            await this.prisma.post.update({
              where: { id },
              data: { downvotes: { increment: 1 } },
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error voting on post:', error);
      throw new HttpException('Failed to vote', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Bookmark a post
  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  async bookmarkPost(@Param('id') id: string, @Request() req: AuthRequest) {
    const userId = req.user.id;

    try {
      const existing = await this.prisma.bookmark.findUnique({
        where: {
          userId_postId: {
            postId: id,
            userId,
          },
        },
      });

      if (existing) {
        // Remove bookmark
        await this.prisma.bookmark.delete({
          where: {
            userId_postId: {
              postId: id,
              userId,
            },
          },
        });
        return { bookmarked: false };
      } else {
        // Add bookmark
        await this.prisma.bookmark.create({
          data: {
            postId: id,
            userId,
          },
        });
        return { bookmarked: true };
      }
    } catch (error) {
      console.error('Error bookmarking post:', error);
      throw new HttpException('Failed to bookmark', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Report a post
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async reportPost(
    @Param('id') id: string,
    @Body() body: { reason: string; description?: string },
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.id;

    // Verify post exists
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    // Prevent duplicate reports
    const existing = await this.prisma.report.findFirst({
      where: { reporterId: userId, postId: id, status: 'pending' },
    });
    if (existing) {
      throw new HttpException('You have already reported this post', HttpStatus.CONFLICT);
    }

    const report = await this.prisma.report.create({
      data: {
        userId: post.authorId,
        reporterId: userId,
        targetId: id,
        targetType: 'POST',
        type: 'POST_REPORT',
        reason: body.reason,
        description: body.description,
        postId: id,
        status: 'pending',
      },
    });

    return { id: report.id, message: 'Report submitted successfully' };
  }

  // Delete a post
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.postsService.remove(id, req.user.id, req.user.role);
  }

  // Get comments for a post
  @Get(':id/comments')
  async getPostComments(
    @Param('id') id: string,
    @Query() query: any,
    @Request() req: any
  ) {
    const { page = '1', limit = '20' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user?.id;

    try {
      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where: {
            postId: id,
            parentId: null, // Only get top-level comments
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
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
            replies: {
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
                votes: true,
              },
            },
            votes: true,
          },
        }),
        this.prisma.comment.count({
          where: {
            postId: id,
            parentId: null,
          },
        }),
      ]);

      // Add user vote info if authenticated
      const commentsWithVotes = userId ? await Promise.all(
        comments.map(async (comment) => {
          const userVote = await this.prisma.vote.findUnique({
            where: {
              userId_commentId: {
                commentId: comment.id,
                userId,
              },
            },
          });

          // Process replies
          const repliesWithVotes = await Promise.all(
            comment.replies.map(async (reply) => {
              const replyVote = await this.prisma.vote.findUnique({
                where: {
                  userId_commentId: {
                    commentId: reply.id,
                    userId,
                  },
                },
              });

              return {
                ...reply,
                upvotes: reply.votes?.filter(v => v.value === 1).length || 0,
                downvotes: reply.votes?.filter(v => v.value === -1).length || 0,
                userVote: replyVote?.value || null,
              };
            })
          );

          return {
            ...comment,
            replies: repliesWithVotes,
            upvotes: comment.votes.filter(v => v.value === 1).length,
            downvotes: comment.votes.filter(v => v.value === -1).length,
            userVote: userVote?.value || null,
          };
        })
      ) : comments.map(comment => ({
        ...comment,
        upvotes: comment.votes.filter(v => v.value === 1).length,
        downvotes: comment.votes.filter(v => v.value === -1).length,
        userVote: null,
      }));

      return {
        comments: commentsWithVotes,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
      };
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new HttpException('Failed to fetch comments', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create comment on a post
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
    @Request() req: AuthRequest
  ) {
    try {
      const comment = await this.prisma.comment.create({
        data: {
          content: body.content,
          postId: id,
          authorId: req.user.id,
          parentId: body.parentId || null,
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

      return {
        ...comment,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new HttpException('Failed to create comment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  // Helper methods for scoring
  private calculateRecencyScore(createdAt: Date): number {
    const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) return 1.0;
    if (hoursOld < 24) return 0.8;
    if (hoursOld < 72) return 0.6;
    if (hoursOld < 168) return 0.4;
    return 0.2;
  }

  private calculateEngagementScore(
    upvotes: number,
    viewCount: number,
    commentCount: number
  ): number {
    const engagementRate = (upvotes * 3 + commentCount * 2 + viewCount) / 100;
    return Math.min(engagementRate, 1.0);
  }

  private calculateRelevanceScore(
    post: any,
    userId: string,
    userCategories: string[]
  ): number {
    // Base relevance
    let score = 0.5;

    // Category match
    if (userCategories.includes(post.category)) {
      score += 0.3;
    }

    // Tag overlap (simplified)
    if (post.tags?.length > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private getTimeRangeDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }
}