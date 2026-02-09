// apps/api/src/ai/ai.service.ts
import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { Prisma } from '@prisma/client';

/**
 * Public interfaces
 */
export interface ResourceSuggestion {
  title: string;
  source: string;
  url?: string;
  relevance: number;
  type: 'research_paper' | 'guideline' | 'tool' | 'article';
}

export interface ModerationResult {
  safe: boolean;
  concerns: string[];
  suggestions: string[];
  severity?: number;
}

interface TagResponse {
  tags: string[];
}

interface InsightsResponse {
  insights: string[];
}

@Injectable()
export class AiService {
  generateText(prompt: string, arg1: { temperature: number; maxTokens: number; }) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(AiService.name);
  private readonly modelName: string;
  private readonly embeddingModel: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private openai: OpenAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey && apiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized successfully');
    } else {
      this.logger.warn('OpenAI API key not configured - AI features will be disabled');
    }

    // Load configuration with defaults - using GPT-5 models
    this.modelName = this.configService.get<string>('AI_MODEL', 'gpt-5');
    this.embeddingModel = this.configService.get<string>('AI_EMBEDDING_MODEL', 'text-embedding-3-large');
    this.maxTokens = this.configService.get<number>('AI_MAX_TOKENS', 1000);
    this.temperature = this.configService.get<number>('AI_TEMPERATURE', 0.3);

    this.logger.log(`AI Service configured with model: ${this.modelName} `);
  }

  private get isAvailable(): boolean {
    return !!this.openai;
  }

  /**
   * 1) Generate context-aware summary based on post type
   */
  async generatePostSummary(content: string, userId?: string, postType: string = 'DISCUSSION'): Promise<string> {
    this.logger.log(`Generating summary for post type: ${postType}. AI Available: ${this.isAvailable} `);
    if (!this.isAvailable) {
      this.logger.warn('AI not available, using fallback summary');
      return this.generateFallbackSummary(content);
    }

    let systemPrompt = "You are a helpful assistant summarizing content for healthcare professionals.";
    let userInstructions = "Summarize the following content in 2-3 sentences.";

    // Dynamic prompting based on post type
    switch (postType) {
      case 'CASE_STUDY':
        systemPrompt = "You are a clinical summarizer. Focus on the patient case, intervention, and outcome.";
        userInstructions = "Provide a 2-3 sentence summary covering: Patient background/condition, Intervention/Therapy used, and Key Outcome/Result. Do not use generic filler.";
        break;
      case 'QUESTION':
        systemPrompt = "You are summarizing a clinical question.";
        userInstructions = "Summarize the core question and the specific context or help needed in 1-2 sentences. Be direct.";
        break;
      case 'RESOURCE':
        systemPrompt = "You are summarizing a shared medical resource.";
        userInstructions = "Summarize what this resource is, who it is for, and its primary utility in 2 sentences.";
        break;
      case 'DISCUSSION':
      default:
        systemPrompt = "You are summarizing a professional discussion.";
        userInstructions = "Summarize the main topic, key arguments, or points raised in 2-3 sentences. Capture the essence of the discussion.";
        break;
    }

    const prompt = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "user" as const,
        content: [
          userInstructions,
          "",
          `Content: \n${content.slice(0, 3000)} `, // Use more context, up to 3000 chars
          "",
          "Summary:"
        ].join("\n")
      }
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        max_tokens: 200,
        temperature: 0.3, // Slightly higher for better fluency
      });

      if (userId) {
        await this.trackTokenUsage(userId, response.usage?.total_tokens, 'summary');
      }

      return response.choices?.[0]?.message?.content?.trim() || this.generateFallbackSummary(content);
    } catch (err) {
      this.logger.error('AI summary failed - using fallback', err);
      if (err instanceof Error) {
        this.logger.error(`Error details: ${err.message} `);
        this.logger.error(`Stack: ${err.stack} `);
      }
      return this.generateFallbackSummary(content);
    }
  }

  private generateFallbackSummary(content: string): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 2).join(' ');
    return summary.length > 200 ? summary.slice(0, 197) + '...' : summary;
  }

  /**
   * Extract outcome-focused text from content (basic heuristic)
   */
  private extractOutcomeFocusedText(content: string): string {
    // Simple heuristic: extract sentences mentioning outcomes, metrics, or changes
    const outcomeKeywords = [
      'improved', 'decreased', 'increased', 'reduced', 'outcome', 'result', 'change', 'difference', '%', 'score', 'rate', 'frequency', 'success', 'failure'
    ];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const outcomeSentences = sentences.filter(s =>
      outcomeKeywords.some(k => s.toLowerCase().includes(k))
    );
    // Return up to 5 outcome-focused sentences, or fallback to last 5 sentences
    return outcomeSentences.slice(0, 5).join(' ').trim() ||
      sentences.slice(-5).join(' ').trim();
  }

  /**
   * 2) Redact PII/PHI
   */
  async redactSensitiveInfo(text: string): Promise<string> {
    if (!this.isAvailable) return this.redactWithRegex(text);

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a medical privacy filter specializing in HIPAA compliance.'
      },
      {
        role: 'user' as const,
        content: [
          'Replace all PII/PHI with [REDACTED] including:',
          '- Names (patients, doctors, family)',
          '- Ages, dates, years',
          '- Locations (cities, hospitals, clinics)',
          '- Contact info (emails, phones)',
          '- ID numbers (MRN, SSN)',
          '',
          'Keep all clinical information intact.',
          '',
          `Text: \n${text.slice(0, 5000)} `,
          '',
          'Redacted text:'
        ].join('\n'),
      },
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        temperature: 0.1,
        max_tokens: Math.min(1500, Math.ceil(text.length * 1.2)),
      });

      return response.choices?.[0]?.message?.content?.trim() || this.redactWithRegex(text);
    } catch (err) {
      this.logger.error('AI redaction failed - using regex', err);
      return this.redactWithRegex(text);
    }
  }

  private redactWithRegex(text: string): string {
    if (!text) return '';
    let out = text;

    // Emails
    out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTED]');

    // Phone numbers
    out = out.replace(/\b\+?\d[\d\s().-]{7,}\b/g, '[PHONE_REDACTED]');

    // Medical record numbers
    out = out.replace(/\b(MRN|Medical Record|Patient ID|Case)[#:\s]*\w+/gi, '[ID_REDACTED]');

    // Dates
    out = out.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '[DATE_REDACTED]');

    // Ages
    out = out.replace(/\b(age|aged)\s*\d{1,3}\b/gi, '[AGE_REDACTED]');

    // Names after titles
    out = out.replace(/\b(Mr|Ms|Mrs|Dr|Prof)\.?\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?/g, '[NAME_REDACTED]');

    return out;
  }

  /**
   * 3) Extract key insights
   */
  async extractKeyInsights(content: string, userId?: string): Promise<string[]> {
    if (!this.isAvailable) return this.extractInsightsWithNLP(content);

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a clinical insights extractor for healthcare professionals.'
      },
      {
        role: 'user' as const,
        content: [
          'Extract 3-5 actionable clinical insights (each ≤100 chars).',
          'Focus on outcomes, interventions, and clinical implications.',
          '',
          `Post: \n${content.slice(0, 3000)} `,
          '',
          'Return JSON only:',
          '{"insights": ["insight1", "insight2", "insight3"]}'
        ].join('\n'),
      },
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      if (userId) {
        await this.trackTokenUsage(userId, response.usage?.total_tokens, 'insights');
      }

      const parsed = this.safeParseJSON<InsightsResponse>(
        response.choices?.[0]?.message?.content || ''
      );

      const insights = parsed?.insights?.filter(i => typeof i === 'string' && i.length <= 100) || [];

      return insights.length >= 3 ? insights : this.extractInsightsWithNLP(content);
    } catch (err) {
      this.logger.error('AI insights failed - using NLP', err);
      return this.extractInsightsWithNLP(content);
    }
  }

  private extractInsightsWithNLP(content: string): string[] {
    const insights: string[] = [];
    const lines = content.split(/[.\n]/).filter(l => l.trim());

    for (const line of lines) {
      // Look for outcome indicators
      if (/\d+%|improved|decreased|increased|significant|effective/i.test(line)) {
        const insight = line.trim().slice(0, 100);
        if (insight.length > 20) {
          insights.push(insight);
        }
      }
      if (insights.length >= 5) break;
    }

    return insights.slice(0, 5);
  }

  /**
   * 4) Generate smart tags
   */
  async generateSmartTags(content: string, title: string, userId?: string, postType: string = 'DISCUSSION'): Promise<string[]> {
    this.logger.log(`Generating tags for post type: ${postType}. AI Available: ${this.isAvailable} `);
    if (!this.isAvailable) {
      this.logger.warn('AI not available, using fallback tags');
      return this.generateTagsHeuristic(title, content);
    }

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a content tagger for a healthcare professional community.'
      },
      {
        role: 'user' as const,
        content: [
          `Generate 5 - 8 relevant tags for this ${postType}.`,
          'Rules:',
          '- Use lowercase, hyphenated format (e.g., sensory-processing).',
          '- Mix clinical terms (e.g., autism-spectrum, occupational-therapy) with broader topics (e.g., career-advice, burnout, resources) as appropriate.',
          '- Be specific but not obscure.',
          '',
          `Title: ${title} `,
          `Content: ${content.slice(0, 2000)} `,
          '',
          'Return JSON only:',
          '{"tags": ["tag-1", "tag-2", "tag-3"]}'
        ].join('\n'),
      },
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        temperature: 0.4, // Allow a bit more creativity for tags
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      if (userId) {
        await this.trackTokenUsage(userId, response.usage?.total_tokens, 'tags');
      }

      const parsed = this.safeParseJSON<TagResponse>(
        response.choices?.[0]?.message?.content || ''
      );

      let tags = parsed?.tags?.filter(t => typeof t === 'string') || [];

      // Normalize tags
      tags = tags
        .map(t => this.normalizeTag(t))
        .filter(t => t.length >= 2 && t.length <= 40); // Relaxed length constraints

      // Remove duplicates
      tags = [...new Set(tags)];

      // If AI returns too few tags, supplement with heuristics
      if (tags.length < 3) {
        const heuristicTags = this.generateTagsHeuristic(title, content);
        tags = [...new Set([...tags, ...heuristicTags])];
      }

      return tags.slice(0, 10);
    } catch (err) {
      this.logger.error('AI tags failed - using heuristic', err);
      if (err instanceof Error) {
        this.logger.error(`Error details: ${err.message} `);
      }
      return this.generateTagsHeuristic(title, content);
    }
  }

  private normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateTagsHeuristic(title: string, content: string): string[] {
    const text = `${title} ${content} `.toLowerCase();
    const tags = new Set<string>();

    // Common therapy terms
    const therapies = [
      'occupational-therapy', 'speech-therapy', 'physical-therapy',
      'aba-therapy', 'dir-floortime', 'sensory-integration'
    ];

    // Common conditions
    const conditions = [
      'autism', 'adhd', 'cerebral-palsy', 'down-syndrome',
      'developmental-delay', 'selective-mutism'
    ];

    // Check for presence
    [...therapies, ...conditions].forEach(term => {
      if (text.includes(term.replace(/-/g, ' ')) || text.includes(term)) {
        tags.add(term);
      }
    });

    // Add general tags if too few
    if (tags.size < 3) {
      tags.add('therapy');
      tags.add('pediatric');
      tags.add('clinical');
    }

    return Array.from(tags).slice(0, 7);
  }

  /**
   * 5) Moderate content for safety
   */
  async moderateHealthContent(content: string): Promise<ModerationResult> {
    if (!this.isAvailable) return this.basicSafetyHeuristic(content);

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a healthcare content safety moderator.'
      },
      {
        role: 'user' as const,
        content: [
          'Check for:',
          '1. Medical misinformation or dangerous advice',
          '2. Unprofessional language',
          '3. Unverified claims',
          '4. Potential harm to patients',
          '',
          `Content: \n${content.slice(0, 3000)} `,
          '',
          'Return JSON:',
          '{"safe": true/false, "concerns": [], "suggestions": [], "severity": 0-1}'
        ].join('\n'),
      },
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const parsed = this.safeParseJSON<ModerationResult>(
        response.choices?.[0]?.message?.content || ''
      );

      if (parsed && typeof parsed.safe === 'boolean') {
        return parsed;
      }

      return this.basicSafetyHeuristic(content);
    } catch (err) {
      this.logger.error('AI moderation failed - using heuristic', err);
      return this.basicSafetyHeuristic(content);
    }
  }

  private async checkAndIncrementUsage(userId: string) {
    const usage = await this.prisma.aiUsage.findUnique({
      where: { userId },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Default limit
    let limit = 3;
    let count = 0;

    if (usage) {
      // Check if reset is needed (if last reset was in a previous month)
      const lastReset = new Date(usage.lastResetDate);
      if (lastReset.getMonth() !== currentMonth || lastReset.getFullYear() !== currentYear) {
        // Reset count
        await this.prisma.aiUsage.update({
          where: { userId },
          data: {
            count: 1, // Start at 1 for this request
            lastResetDate: now,
          },
        });
        return; // Allowed (reset happened)
      }

      limit = usage.limit;
      count = usage.count;
    } else {
      // Create record if not exists
      await this.prisma.aiUsage.create({
        data: { userId, count: 1, limit: 3 },
      });
      return; // Allowed
    }

    if (count >= limit) {
      throw new ForbiddenException(
        limit === 3
          ? 'Free limit reached. Please upgrade to continue.'
          : 'Monthly limit reached.'
      );
    }

    // Increment
    await this.prisma.aiUsage.update({
      where: { userId },
      data: { count: { increment: 1 } },
    });
  }

  private basicSafetyHeuristic(content: string): ModerationResult {
    const concerns: string[] = [];
    const suggestions: string[] = [];
    const text = content.toLowerCase();

    if (/cure guaranteed|100% effective|miracle/i.test(text)) {
      concerns.push('Unverified medical claims');
      suggestions.push('Add evidence or disclaimers');
    }

    if (/stop.{0,20}medication|ignore.{0,20}doctor/i.test(text)) {
      concerns.push('Potentially harmful advice');
      suggestions.push('Recommend consulting healthcare providers');
    }

    const severity = concerns.length > 1 ? 0.7 : concerns.length > 0 ? 0.4 : 0;

    return {
      safe: concerns.length === 0,
      concerns,
      suggestions,
      severity
    };
  }

  /**
   * 6) Suggest resources
   */
  async suggestResources(topic: string, userId?: string): Promise<ResourceSuggestion[]> {
    if (!this.isAvailable) return this.suggestResourcesHeuristic(topic);

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a medical librarian suggesting evidence-based resources.'
      },
      {
        role: 'user' as const,
        content: [
          `Suggest 3 high - quality resources about: ${topic} `,
          'Use only: PubMed, Cochrane, NIH, WHO, major medical journals',
          '',
          'Return JSON:',
          '{"resources": [{"title": "...", "source": "...", "url": "...", "relevance": 0.9, "type": "research_paper"}]}'
        ].join('\n'),
      },
    ];

    try {
      const response = await this.chatWithRetry({
        model: this.modelName,
        messages: prompt,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      });

      if (userId) {
        await this.trackTokenUsage(userId, response.usage?.total_tokens, 'resources');
      }

      const parsed = this.safeParseJSON<{ resources: ResourceSuggestion[] }>(
        response.choices?.[0]?.message?.content || ''
      );

      const resources = parsed?.resources?.filter(this.isValidResource) || [];

      return resources.length > 0 ? resources.slice(0, 3) : this.suggestResourcesHeuristic(topic);
    } catch (err) {
      this.logger.error('AI resources failed - using heuristic', err);
      return this.suggestResourcesHeuristic(topic);
    }
  }

  private isValidResource(obj: any): obj is ResourceSuggestion {
    return (
      obj &&
      typeof obj.title === 'string' &&
      typeof obj.source === 'string' &&
      typeof obj.relevance === 'number' &&
      obj.relevance >= 0 && obj.relevance <= 1 &&
      ['research_paper', 'guideline', 'tool', 'article'].includes(obj.type)
    );
  }

  private suggestResourcesHeuristic(topic: string): ResourceSuggestion[] {
    return [
      {
        title: `PubMed search: ${topic} `,
        source: 'PubMed',
        url: 'https://pubmed.ncbi.nlm.nih.gov',
        relevance: 0.8,
        type: 'research_paper'
      },
      {
        title: `Cochrane Reviews: ${topic} `,
        source: 'Cochrane',
        url: 'https://www.cochranelibrary.com',
        relevance: 0.8,
        type: 'research_paper'
      },
      {
        title: 'Clinical Practice Guidelines',
        source: 'NIH',
        url: 'https://www.nih.gov',
        relevance: 0.7,
        type: 'guideline'
      }
    ];
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isAvailable) return [];

    try {
      const response = await this.openai!.embeddings.create({
        model: this.embeddingModel,
        input: text.slice(0, 8000),
      });
      return response.data?.[0]?.embedding || [];
    } catch (err) {
      this.logger.error('Embedding generation failed', err);
      return [];
    }
  }

  /**
   * Calculate similarity between embeddings
   */
  async calculateSimilarity(vecA: number[], vecB: number[]): Promise<number> {
    if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
  }

  /**
   * Find similar posts
   */
  async findSimilarPosts(postId: string, limit = 5): Promise<Array<{ postId: string; similarity: number }>> {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { embedding: true },
      });

      if (!post?.embedding?.length) return [];

      const otherPosts = await this.prisma.post.findMany({
        where: {
          id: { not: postId },
          isPublished: true,
          NOT: { embedding: { equals: [] } },
        },
        select: { id: true, embedding: true },
      });

      const similarities = await Promise.all(
        otherPosts.map(async other => ({
          postId: other.id,
          similarity: await this.calculateSimilarity(post.embedding, other.embedding),
        }))
      );

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (err) {
      this.logger.error('Failed to find similar posts', err);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const isEnabled = this.isAvailable;

    return {
      status: isEnabled ? 'healthy' : 'disabled',
      aiEnabled: isEnabled,
      model: isEnabled ? this.modelName : null,
      embeddingModel: isEnabled ? this.embeddingModel : null,
      features: {
        piiRedaction: true,
        summarization: isEnabled,
        tagging: isEnabled,
        embeddings: isEnabled,
        moderation: isEnabled,
        insights: isEnabled,
      },
    };
  }

  /**
   * Usage tracking
   */
  private async trackTokenUsage(
    userId: string | undefined,
    tokens: number | undefined,
    feature: string
  ): Promise<void> {
    if (!userId || !tokens) return;

    try {
      await this.prisma.analytics.create({
        data: {
          userId,
          event: 'ai_token_usage',
          metadata: { tokens, feature, timestamp: new Date().toISOString() } as Prisma.JsonObject,
        },
      });
    } catch (err) {
      this.logger.debug('Token tracking failed', err);
    }
  }

  /**
   * Get user usage stats
   */
  async getUserUsageStats(userId: string): Promise<any> {
    try {
      const stats = await this.prisma.analytics.findMany({
        where: { userId, event: 'ai_token_usage' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const totalTokens = stats.reduce((sum, stat) =>
        sum + ((stat.metadata as any)?.tokens || 0), 0
      );

      return {
        userId,
        totalTokens,
        totalCalls: stats.length,
        estimatedCost: (totalTokens / 1000) * 0.01, // GPT-4 pricing
      };
    } catch (err) {
      this.logger.error('Failed to get usage stats', err);
      return { userId, totalTokens: 0, totalCalls: 0, estimatedCost: 0 };
    }
  }

  /**
  * Get overall usage statistics across all users
  */
  async getOverallUsageStats(startDate?: string, endDate?: string): Promise<any> {
    try {
      const where: any = {
        event: 'ai_token_usage',
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const stats = await this.prisma.analytics.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const totalTokens = stats.reduce((sum, stat) =>
        sum + ((stat.metadata as any)?.tokens || 0), 0
      );

      const uniqueUsers = new Set(stats.map(s => s.userId)).size;

      const byFeature = stats.reduce((acc, stat) => {
        const feature = (stat.metadata as any)?.feature || 'unknown';
        const tokens = (stat.metadata as any)?.tokens || 0;
        acc[feature] = (acc[feature] || 0) + tokens;
        return acc;
      }, {} as Record<string, number>);

      const modelPricing = this.modelName.includes('gpt-4') ? 0.01 : 0.002;

      return {
        totalTokens,
        totalCalls: stats.length,
        uniqueUsers,
        byFeature,
        estimatedCost: (totalTokens / 1000) * modelPricing,
        period: {
          start: startDate || 'all-time',
          end: endDate || 'current',
        },
      };
    } catch (err) {
      this.logger.error('Failed to get overall usage stats', err);
      return {
        totalTokens: 0,
        totalCalls: 0,
        uniqueUsers: 0,
        byFeature: {},
        estimatedCost: 0,
        period: {
          start: startDate || 'all-time',
          end: endDate || 'current',
        },
      };
    }
  }

  /**
   * Retry logic with exponential backoff
   * + GPT-5 normalization (tokens & temperature)
   */
  private normalizeParamsForModel(params: any) {
    const p: any = { ...params };

    // Token param migration
    if (p.max_tokens != null) {
      p.max_completion_tokens = p.max_tokens;
      delete p.max_tokens;
    }

    // GPT-5: drop unsupported tunables
    if (typeof p.model === 'string' && p.model.startsWith('gpt-5')) {
      if ('temperature' in p) delete p.temperature;
      // If you ever add these, also drop them for GPT-5:
      // if ('top_p' in p) delete p.top_p;
      // if ('frequency_penalty' in p) delete p.frequency_penalty;
      // if ('presence_penalty' in p) delete p.presence_penalty;
    }

    return p;
  }

  private async chatWithRetry(params: any, maxAttempts = 3): Promise<any> {
    if (!this.openai) throw new Error('OpenAI not configured');

    let lastError: any;
    let delay = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const normalized = this.normalizeParamsForModel(params);
        return await this.openai.chat.completions.create(normalized);
      } catch (err: any) {
        lastError = err;

        if (err.status === 429) {
          // Rate limit - wait longer
          await new Promise(r => setTimeout(r, delay * 2));
          delay *= 2;
        } else if (err.status >= 500) {
          // Server error - retry with backoff
          await new Promise(r => setTimeout(r, delay));
          delay *= 1.5;
        } else {
          // Client error - don't retry
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Safe JSON parsing
   */
  private safeParseJSON<T>(raw: string): T | null {
    try {
      // Remove markdown code blocks if present
      const cleaned = raw.replace(/```json ?\n ? /g, '').replace(/```/g, '');
      return JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from the string
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch { }
      }
      return null;
    }
  }
}
