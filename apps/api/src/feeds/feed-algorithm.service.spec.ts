import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { PersonalizationService } from './personalization.service';

/**
 * Item #27 of PERFORMANCE_AUDIT.md: the For-You feed must issue a fixed
 * number of database statements regardless of how many candidate posts it
 * scores, and it must not write to the database inside a GET.
 */
describe('FeedAlgorithmService.generateForYouFeed', () => {
  const userId = 'user-1';
  const now = Date.now();

  const makePost = (i: number, overrides: Partial<any> = {}) => ({
    id: `post-${i}`,
    authorId: `author-${i % 4}`,
    category: ['AUTISM', 'ADHD', 'DYSLEXIA'][i % 3],
    tags: i % 4 === 0 ? ['sleep'] : ['school'],
    upvotes: i,
    viewCount: 10 * (i + 1),
    createdAt: new Date(now - i * 3_600_000),
    _count: { comments: i % 3, bookmarks: i % 2 },
    ...overrides,
  });

  const candidates = Array.from({ length: 30 }, (_, i) => makePost(i));

  let prisma: Record<string, any>;
  let service: FeedAlgorithmService;

  const prismaCallCount = () =>
    Object.values(prisma)
      .flatMap((model: any) =>
        typeof model === 'function'
          ? [model]
          : Object.values(model as Record<string, jest.Mock>),
      )
      .reduce((n: number, fn: any) => n + (fn.mock?.calls.length ?? 0), 0);

  beforeEach(async () => {
    prisma = {
      feedInteraction: {
        findMany: jest.fn().mockResolvedValue([
          {
            action: 'VOTE',
            timestamp: new Date(now - 60_000),
            post: { category: 'AUTISM', tags: ['sleep'] },
          },
          {
            action: 'VIEW',
            timestamp: new Date(now - 120_000),
            post: { category: 'ADHD', tags: ['school'] },
          },
        ]),
        count: jest.fn(),
      },
      userInterests: { upsert: jest.fn(), findMany: jest.fn() },
      userPreferences: {
        findUnique: jest.fn().mockResolvedValue({
          userId,
          recencyWeight: 30,
          relevanceWeight: 40,
          engagementWeight: 30,
        }),
        create: jest.fn(),
      },
      follow: {
        findMany: jest.fn().mockResolvedValue([{ followingId: 'author-1' }]),
        findUnique: jest.fn(),
      },
      post: {
        findMany: jest
          .fn()
          // stage 1, stage 2, followed, discovery — each returns a slice
          .mockResolvedValueOnce(candidates.slice(0, 12))
          .mockResolvedValueOnce(candidates.slice(8, 17))
          .mockResolvedValueOnce(candidates.slice(15, 21))
          .mockResolvedValueOnce(candidates.slice(21, 30)),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ authorId: 'author-2', count: 3 }]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedAlgorithmService,
        PersonalizationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(FeedAlgorithmService);
  });

  it('scores 30 candidates with a bounded number of statements and no writes', async () => {
    const result = await service.generateForYouFeed(userId, 1, 10);

    expect(result.posts).toHaveLength(10);
    expect(result.hasMore).toBe(true);

    // interests (1) + 4 candidate stages + followed-users lookup (1)
    // + preferences (1) + follows (1) + author interaction counts (1) = 9
    expect(prismaCallCount()).toBeLessThanOrEqual(9);

    // A GET must not write.
    expect(prisma.userInterests.upsert).not.toHaveBeenCalled();
    expect(prisma.userPreferences.create).not.toHaveBeenCalled();

    // No per-post lookups.
    expect(prisma.follow.findUnique).not.toHaveBeenCalled();
    expect(prisma.feedInteraction.count).not.toHaveBeenCalled();
  });

  it('keeps every candidate (none dropped), ranks by score, and diversifies the first window', async () => {
    const page1 = await service.generateForYouFeed(userId, 1, 10);
    expect(page1.posts.every((p: any) => typeof p.score === 'number')).toBe(true);
    expect(page1.totalScore).toBeGreaterThan(0);

    // The top-ranked post always leads the feed.
    const allScores = page1.posts.map((p: any) => p.score);
    expect(page1.posts[0].score).toBe(Math.max(...allScores));

    // Diversity: at most 2 posts per author / category in the first window
    // of 5 (the data has 3 categories and 4 authors, so this is satisfiable).
    const window = page1.posts.slice(0, 5);
    const byAuthor = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const p of window) {
      byAuthor.set(p.authorId, (byAuthor.get(p.authorId) ?? 0) + 1);
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
    }
    expect(Math.max(...byAuthor.values())).toBeLessThanOrEqual(2);
    expect(Math.max(...byCategory.values())).toBeLessThanOrEqual(2);
  });

  it('never drops a candidate: paging through returns all 30 exactly once', async () => {
    const seen = new Set<string>();
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      // fresh mocks per page: re-arm the candidate stages
      prisma.post.findMany
        .mockResolvedValueOnce(candidates.slice(0, 12))
        .mockResolvedValueOnce(candidates.slice(8, 17))
        .mockResolvedValueOnce(candidates.slice(15, 21))
        .mockResolvedValueOnce(candidates.slice(21, 30));
      const result = await service.generateForYouFeed(userId, page, 10);
      for (const p of result.posts) {
        expect(seen.has(p.id)).toBe(false);
        seen.add(p.id);
      }
      hasMore = result.hasMore;
      page++;
      expect(page).toBeLessThan(10);
    }
    expect(seen.size).toBe(30);
  });

  it('gives followed authors a higher author component than strangers', async () => {
    const personalization = (service as any).personalization as PersonalizationService;
    const interests = { categories: {}, tags: {} };
    const posts = [
      makePost(0, { authorId: 'author-1', upvotes: 0, viewCount: 1, _count: { comments: 0, bookmarks: 0 } }),
      makePost(1, { authorId: 'author-9', upvotes: 0, viewCount: 1, _count: { comments: 0, bookmarks: 0 }, createdAt: posts0CreatedAt() }),
    ];
    function posts0CreatedAt() {
      return new Date(now);
    }
    posts[0].createdAt = new Date(now);

    const scored = await personalization.scorePosts(userId, posts, interests);
    const followed = scored.find((p) => p.id === 'post-0')!;
    const stranger = scored.find((p) => p.id === 'post-1')!;
    expect(followed.score).toBeGreaterThan(stranger.score);
  });
});
