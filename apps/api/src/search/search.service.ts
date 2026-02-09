// ============================================
// SECURE search.service.ts - VULN-002 SQL Injection Fixed
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { Prisma } from '@prisma/client';

export interface SearchFiltersDto {
  category?: string;
  type?: string;
  authorRole?: string;
  verifiedOnly?: boolean;
  sortBy?: 'relevance' | 'recent' | 'popular';
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    role: string;
    verificationStatus: string;
  };
  score: number;
  highlights: string[];
  createdAt: Date;
  upvotes: number;
  views: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private aiService: AiService,
  ) { }

  /**
   * Hybrid search combining vector similarity and text search
   */
  async hybridSearch(params: {
    query: string;
    limit?: number;
    offset?: number;
    filters?: SearchFiltersDto;
  }): Promise<{ results: SearchResult[]; total: number }> {
    const { query, limit = 20, offset = 0, filters } = params;

    try {
      // Generate embedding for semantic search
      let embedding: number[] = [];
      try {
        embedding = await this.aiService.generateEmbedding(query);
      } catch (err) {
        this.logger.warn('Embedding generation failed, falling back to text search');
      }

      // If we have embedding, use vector search
      if (embedding.length > 0) {
        const results = await this.vectorSearch(embedding, limit, filters);
        return { results, total: results.length };
      }

      // Fallback to text search
      const results = await this.textSearch(query, limit, filters);
      return { results, total: results.length };
    } catch (error) {
      this.logger.error('Hybrid search failed:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * ============================================
   * FIX: VULN-002 - Secure Vector Search with Parameterized Queries
   * ============================================
   * 
   * BEFORE (VULNERABLE):
   * const whereClause = this.buildWhereClause(filters); // User input directly used
   * const results = await this.prisma.$queryRawUnsafe(queryStr, ...);
   * 
   * AFTER (FIXED):
   * Use parameterized queries with proper escaping
   */
  private async vectorSearch(
    embedding: number[],
    limit: number,
    filters?: SearchFiltersDto,
  ): Promise<SearchResult[]> {
    try {
      // Convert embedding to PostgreSQL vector format
      const embeddingString = `[${embedding.join(',')}]`;

      // Build parameterized query safely
      // We use Prisma's template literal syntax which automatically parameterizes values

      // First, get the base results with vector similarity
      const baseQuery = Prisma.sql`
        SELECT 
          p.id,
          p.title,
          p.content,
          p.type,
          p.category,
          p.tags,
          p."createdAt",
          p.upvotes,
          p.views,
          u.id as "authorId",
          u.name as "authorName",
          u.role as "authorRole",
          u."verificationStatus" as "authorVerificationStatus",
          1 - (p.embedding_vector <=> ${embeddingString}::vector) as similarity
        FROM "Post" p
        JOIN "User" u ON p."authorId" = u.id
        WHERE p."isPublished" = true
          AND p."moderationStatus" = 'APPROVED'
      `;

      // Apply filters using safe parameterized conditions
      let results: any[];

      if (filters?.category && filters?.type && filters?.authorRole && filters?.verifiedOnly) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND p.category = ${filters.category}
          AND p.type = ${filters.type}
          AND u.role = ${filters.authorRole}
          AND u."verificationStatus" = 'VERIFIED'
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else if (filters?.category && filters?.type && filters?.authorRole) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND p.category = ${filters.category}
          AND p.type = ${filters.type}
          AND u.role = ${filters.authorRole}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else if (filters?.category && filters?.type) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND p.category = ${filters.category}
          AND p.type = ${filters.type}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else if (filters?.category) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND p.category = ${filters.category}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else if (filters?.type) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND p.type = ${filters.type}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else if (filters?.verifiedOnly) {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          AND u."verificationStatus" = 'VERIFIED'
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      } else {
        results = await this.prisma.$queryRaw`
          ${baseQuery}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `;
      }

      return results.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        type: r.type,
        category: r.category,
        tags: r.tags || [],
        author: {
          id: r.authorId,
          name: r.authorName,
          role: r.authorRole,
          verificationStatus: r.authorVerificationStatus,
        },
        score: r.similarity,
        highlights: [],
        createdAt: r.createdAt,
        upvotes: r.upvotes || 0,
        views: r.views || 0,
      }));
    } catch (error) {
      this.logger.error('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Alternative vector search using dynamic query building with proper sanitization
   */
  private async vectorSearchDynamic(
    embedding: number[],
    limit: number,
    filters?: SearchFiltersDto,
  ): Promise<SearchResult[]> {
    try {
      const embeddingString = `[${embedding.join(',')}]`;

      // Build conditions array with parameterized values
      const conditions: Prisma.Sql[] = [
        Prisma.sql`p."isPublished" = true`,
        Prisma.sql`p."moderationStatus" = 'APPROVED'`,
      ];

      // Add filters safely using Prisma.sql template
      if (filters?.category) {
        conditions.push(Prisma.sql`p.category = ${filters.category}`);
      }

      if (filters?.type) {
        conditions.push(Prisma.sql`p.type = ${filters.type}`);
      }

      if (filters?.authorRole) {
        conditions.push(Prisma.sql`u.role = ${filters.authorRole}`);
      }

      if (filters?.verifiedOnly) {
        conditions.push(Prisma.sql`u."verificationStatus" = 'VERIFIED'`);
      }

      // Join conditions with AND
      const whereClause = Prisma.join(conditions, ' AND ');

      // Execute parameterized query
      const results = await this.prisma.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.title,
          p.content,
          p.type,
          p.category,
          p.tags,
          p."createdAt",
          p.upvotes,
          p.views,
          u.id as "authorId",
          u.name as "authorName",
          u.role as "authorRole",
          u."verificationStatus" as "authorVerificationStatus",
          1 - (p.embedding_vector <=> ${embeddingString}::vector) as similarity
        FROM "Post" p
        JOIN "User" u ON p."authorId" = u.id
        WHERE ${whereClause}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      return results.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        type: r.type,
        category: r.category,
        tags: r.tags || [],
        author: {
          id: r.authorId,
          name: r.authorName,
          role: r.authorRole,
          verificationStatus: r.authorVerificationStatus,
        },
        score: r.similarity,
        highlights: [],
        createdAt: r.createdAt,
        upvotes: r.upvotes || 0,
        views: r.views || 0,
      }));
    } catch (error) {
      this.logger.error('Dynamic vector search failed:', error);
      return [];
    }
  }

  /**
   * Text search using Prisma's safe query methods
   */
  private async textSearch(
    query: string,
    limit: number,
    filters?: SearchFiltersDto,
  ): Promise<SearchResult[]> {
    try {
      // Sanitize search query - remove special characters that could affect search
      const sanitizedQuery = query
        .replace(/[^\w\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 2)
        .join(' & ');

      if (!sanitizedQuery) {
        return [];
      }

      // Build Prisma where clause (automatically parameterized)
      const where: Prisma.PostWhereInput = {
        isPublished: true,
        moderationStatus: 'APPROVED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: query.toLowerCase().split(' ') } },
        ],
      };

      // Apply filters safely through Prisma's type-safe API
      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.type) {
        where.type = filters.type as any;
      }

      if (filters?.authorRole) {
        where.author = {
          role: filters.authorRole as any,
        };
      }

      if (filters?.verifiedOnly) {
        where.author = {
          ...where.author,
          verificationStatus: 'VERIFIED' as any,
        };
      }

      // Determine sort order
      let orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };
      if (filters?.sortBy === 'popular') {
        orderBy = { upvotes: 'desc' };
      }

      const posts = await this.prisma.post.findMany({
        where,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
              verificationStatus: true,
            },
          },
        },
      });

      return posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        type: post.type,
        category: post.category,
        tags: post.tags,
        author: {
          id: post.author.id,
          name: post.author.name || 'Anonymous',
          role: post.author.role,
          verificationStatus: post.author.verificationStatus,
        },
        score: 1, // Text search doesn't have similarity score
        highlights: this.generateHighlights(post.content, query),
        createdAt: post.createdAt,
        upvotes: post.upvotes,
        views: post.viewCount,
      }));
    } catch (error) {
      this.logger.error('Text search failed:', error);
      return [];
    }
  }

  /**
   * Generate highlighted snippets from content
   */
  private generateHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const contentLower = content.toLowerCase();

    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + word.length + 50);
        let snippet = content.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        highlights.push(snippet);
        if (highlights.length >= 2) break;
      }
    }

    return highlights;
  }

  /**
   * Get trending searches (cached)
   */
  async getTrendingSearches(): Promise<string[]> {
    // In production, this would query analytics/cache
    return [
      'anxiety management',
      'cognitive behavioral therapy',
      'mindfulness techniques',
      'depression support',
      'child therapy',
    ];
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // Sanitize input
    const sanitizedQuery = query.replace(/[^\w\s]/g, '').trim();

    try {
      // Get unique tags that match
      const posts = await this.prisma.post.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: sanitizedQuery, mode: 'insensitive' } },
            { tags: { hasSome: [sanitizedQuery.toLowerCase()] } },
          ],
        },
        select: { title: true, tags: true },
        take: 10,
      });

      const suggestions = new Set<string>();

      posts.forEach(post => {
        // Add matching words from titles
        const titleWords = post.title.toLowerCase().split(' ');
        titleWords.forEach(word => {
          if (word.includes(sanitizedQuery.toLowerCase()) && word.length > 3) {
            suggestions.add(word);
          }
        });

        // Add matching tags
        post.tags.forEach(tag => {
          if (tag.toLowerCase().includes(sanitizedQuery.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      });

      return Array.from(suggestions).slice(0, 5);
    } catch (error) {
      this.logger.error('Search suggestions failed:', error);
      return [];
    }
  }

  /**
   * Find similar content based on a post ID using vector similarity
   */
  async findSimilarContent(
    postId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Get the post's embedding
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { embedding: true },
      });

      if (!post || !post.embedding) {
        this.logger.warn(`Post ${postId} not found or has no embedding`);
        return [];
      }

      // Use the post's embedding to find similar posts
      const results = await this.vectorSearch(
        post.embedding as unknown as number[],
        limit + 1, // Get one extra to exclude the original post
        { sortBy: 'relevance' }
      );

      // Filter out the original post
      return results.filter(r => r.id !== postId).slice(0, limit);
    } catch (error) {
      this.logger.error('Find similar content failed:', error);
      return [];
    }
  }

  /**
   * Advanced search with additional filters and date ranges
   */
  async advancedSearch(
    searchDto: { query: string; limit?: number; offset?: number },
    filters?: SearchFiltersDto & { dateFrom?: string; dateTo?: string }
  ): Promise<{ results: SearchResult[]; total: number }> {
    try {
      // Use hybrid search as the base
      const baseResults = await this.hybridSearch({
        query: searchDto.query,
        limit: searchDto.limit || 20,
        offset: searchDto.offset || 0,
        filters: filters ? {
          category: filters.category,
          type: filters.type,
          authorRole: filters.authorRole,
          verifiedOnly: filters.verifiedOnly,
          sortBy: filters.sortBy,
        } : undefined,
      });

      // Apply date filters if provided
      if (filters?.dateFrom || filters?.dateTo) {
        const filteredResults = baseResults.results.filter(result => {
          const createdAt = new Date(result.createdAt);

          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            if (createdAt < fromDate) return false;
          }

          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            if (createdAt > toDate) return false;
          }

          return true;
        });

        return {
          results: filteredResults,
          total: filteredResults.length,
        };
      }

      return baseResults;
    } catch (error) {
      this.logger.error('Advanced search failed:', error);
      return { results: [], total: 0 };
    }
  }
}

