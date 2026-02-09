// apps/api/src/agents/clinical-insights.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service'; // Use for embeddings only
import OpenAI from 'openai'; // Use for text generation
import axios from 'axios';
import * as xml2js from 'xml2js';
import {
  CaseParameters,
  PubMedArticle,
  ClinicalInsight,
  SimilarCase,
  ExpertConnection,
  RelevantCommunity,
  StreamProgressEvent,
} from './clinical-insights.types';

@Injectable()
export class ClinicalInsightsService {
  private readonly logger = new Logger(ClinicalInsightsService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private aiService: AiService, // Keep this for embeddings
  ) {
    // Initialize OpenAI for text generation
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Main entry point - orchestrates everything
   */
  async generateInsights(query: string, userId: string): Promise<ClinicalInsight & { conversationId: string }> {
    try {
      this.logger.log(`Generating clinical insights for user ${userId}`);

      // Step 1: Extract case parameters and generate embedding in parallel
      const [caseParams, queryEmbedding] = await Promise.all([
        this.extractCaseParameters(query),
        this.aiService.generateEmbedding(query).catch(() => [] as number[]),
      ]);
      this.logger.debug('Extracted case parameters:', caseParams);

      // Step 2: Run parallel searches (sharing the pre-computed embedding)
      const [similarCases, researchArticles, recommendations, expertConnections, communities, organizations] = await Promise.all([
        this.findSimilarCases(query, caseParams, userId, queryEmbedding),
        this.searchPubMed(caseParams),
        this.generateRecommendations(query, caseParams),
        this.findRelevantExperts(caseParams, queryEmbedding),
        this.findRelevantCommunities(caseParams),
        this.findRelevantOrganizations(caseParams),
      ]);

      // Step 3: Compile and return insights
      const insights: ClinicalInsight = {
        caseAnalysis: caseParams,
        similarCases: similarCases.slice(0, 3),
        researchArticles: researchArticles.slice(0, 5),
        evidenceBasedRecommendations: recommendations.recommendations,
        alternativeApproaches: recommendations.alternatives,
        communities: communities.slice(0, 3),
        expertConnections: expertConnections.slice(0, 3),
        organizations: organizations.slice(0, 5),
        confidence: this.calculateConfidence(similarCases, researchArticles),
        citations: this.compileCitations(researchArticles),
      };

      // Step 4: Save conversation
      const conversation = await this.saveConversation(userId, query, insights);

      // Step 5: Log for analytics
      await this.logAgentUsage(userId, query, insights);

      return { ...insights, conversationId: conversation.id };


    } catch (error) {
      this.logger.error('Failed to generate insights:', error);
      throw error;
    }
  }

  /**
   * Streaming version — yields progress events as each step completes
   */
  async *generateInsightsStreamed(
    query: string,
    userId: string,
  ): AsyncGenerator<StreamProgressEvent> {
    try {
      this.logger.log(`Streaming clinical insights for user ${userId}`);

      yield { step: 'extracting', progress: 10, message: 'Extracting case parameters...' };

      const [caseParams, queryEmbedding] = await Promise.all([
        this.extractCaseParameters(query),
        this.aiService.generateEmbedding(query).catch(() => [] as number[]),
      ]);

      yield {
        step: 'parameters',
        progress: 25,
        message: 'Case parameters extracted. Searching databases...',
        data: { caseAnalysis: caseParams },
      };

      // Batch 1: searches
      const [similarCases, researchArticles, communities, organizations] = await Promise.all([
        this.findSimilarCases(query, caseParams, userId, queryEmbedding),
        this.searchPubMed(caseParams),
        this.findRelevantCommunities(caseParams),
        this.findRelevantOrganizations(caseParams),
      ]);

      yield { step: 'searching', progress: 55, message: 'Search complete. Generating recommendations...' };

      // Batch 2: AI generation + experts
      const [recommendations, expertConnections] = await Promise.all([
        this.generateRecommendations(query, caseParams),
        this.findRelevantExperts(caseParams, queryEmbedding),
      ]);

      yield { step: 'generating', progress: 85, message: 'Compiling results...' };

      const insights: ClinicalInsight = {
        caseAnalysis: caseParams,
        similarCases: similarCases.slice(0, 3),
        researchArticles: researchArticles.slice(0, 5),
        evidenceBasedRecommendations: recommendations.recommendations,
        alternativeApproaches: recommendations.alternatives,
        communities: communities.slice(0, 3),
        expertConnections: expertConnections.slice(0, 3),
        organizations: organizations.slice(0, 5),
        confidence: this.calculateConfidence(similarCases, researchArticles),
        citations: this.compileCitations(researchArticles),
      };

      const conversation = await this.saveConversation(userId, query, insights);
      await this.logAgentUsage(userId, query, insights);

      yield {
        step: 'complete',
        progress: 100,
        message: 'Analysis complete',
        data: { ...insights, conversationId: conversation.id } as any,
      };
    } catch (error) {
      this.logger.error('Failed to generate streamed insights:', error);
      throw error;
    }
  }

  async getHistory(userId: string) {
    return this.prisma.clinicalConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: {
          select: { messages: true }
        }
      }
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation;
  }

  async submitFeedback(userId: string, conversationId: string, value: number, comment?: string) {
    return this.prisma.clinicalFeedback.upsert({
      where: { userId_conversationId: { userId, conversationId } },
      update: { value, comment },
      create: { userId, conversationId, value, comment },
    });
  }

  async generateFollowUp(
    conversationId: string,
    query: string,
    userId: string,
  ): Promise<ClinicalInsight & { conversationId: string }> {
    // Load existing conversation with last 5 messages for context
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found');
    }

    // Build context from previous assistant message metadata (original case params)
    const lastAssistantMsg = conversation.messages.find(m => m.role === 'assistant');
    const previousInsights = lastAssistantMsg?.metadata as any;
    const previousCaseParams = previousInsights?.caseAnalysis as CaseParameters | undefined;

    // Enrich query with previous context
    const enrichedQuery = previousCaseParams
      ? `Previous context - Diagnosis: ${previousCaseParams.diagnosis.join(', ')}. Challenges: ${previousCaseParams.challenges.join(', ')}. Follow-up question: ${query}`
      : query;

    // Run the same pipeline with enriched context
    const [caseParams, queryEmbedding] = await Promise.all([
      this.extractCaseParameters(enrichedQuery),
      this.aiService.generateEmbedding(enrichedQuery).catch(() => [] as number[]),
    ]);

    // Merge previous params with new ones
    if (previousCaseParams) {
      caseParams.diagnosis = [...new Set([...previousCaseParams.diagnosis, ...caseParams.diagnosis])];
      caseParams.challenges = [...new Set([...previousCaseParams.challenges, ...caseParams.challenges])];
      if (previousCaseParams.goals) {
        caseParams.goals = [...new Set([...(previousCaseParams.goals || []), ...(caseParams.goals || [])])];
      }
    }

    const [similarCases, researchArticles, recommendations, expertConnections, communities, organizations] = await Promise.all([
      this.findSimilarCases(enrichedQuery, caseParams, userId, queryEmbedding),
      this.searchPubMed(caseParams),
      this.generateRecommendations(enrichedQuery, caseParams),
      this.findRelevantExperts(caseParams, queryEmbedding),
      this.findRelevantCommunities(caseParams),
      this.findRelevantOrganizations(caseParams),
    ]);

    const insights: ClinicalInsight = {
      caseAnalysis: caseParams,
      similarCases: similarCases.slice(0, 3),
      researchArticles: researchArticles.slice(0, 5),
      evidenceBasedRecommendations: recommendations.recommendations,
      alternativeApproaches: recommendations.alternatives,
      communities: communities.slice(0, 3),
      expertConnections: expertConnections.slice(0, 3),
      organizations: organizations.slice(0, 5),
      confidence: this.calculateConfidence(similarCases, researchArticles),
      citations: this.compileCitations(researchArticles),
    };

    // Append messages to existing conversation
    await this.prisma.clinicalMessage.createMany({
      data: [
        { conversationId, role: 'user', content: query },
        { conversationId, role: 'assistant', content: 'Follow-up analysis', metadata: insights as any },
      ],
    });

    await this.prisma.clinicalConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { ...insights, conversationId };
  }

  async createStructuredPlan(recommendation: any, userId: string): Promise<any> {
    const prompt = `Create a detailed, week-by-week implementation plan for this recommendation:
    ${JSON.stringify(recommendation)}
    
    Return as JSON with structure:
    {
      "title": "Plan Title",
      "weeks": [
        { "week": 1, "focus": "...", "activities": ["..."], "goals": "..." }
      ]
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000, // Increase token limit to prevent truncation
        response_format: { type: 'json_object' }, // Enforce JSON mode
      });

      const content = response.choices[0]?.message?.content || '{}';
      // Clean up potentially wrapped content (even with valid JSON mode, sometimes extra text appears or we just want to be safe)
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const planContent = JSON.parse(jsonStr);

      // Save to database
      // @ts-ignore
      const plan = await this.prisma.clinicalPlan.create({
        data: {
          userId,
          title: planContent.title || 'Structured Plan',
          content: planContent,
        },
      });

      return {
        ...planContent,
        id: plan.id, // Return the plan ID
      };
    } catch (error) {
      this.logger.error('Error creating structured plan:', error);
      throw new Error('Failed to generate plan');
    }
  }

  async getPlan(id: string) {
    // @ts-ignore
    return this.prisma.clinicalPlan.findUnique({
      where: { id },
    });
  }

  private async saveConversation(userId: string, query: string, insights: ClinicalInsight) {
    const title = insights.caseAnalysis.diagnosis[0]
      ? `Case: ${insights.caseAnalysis.diagnosis.join(', ')}`
      : `Clinical Analysis ${new Date().toLocaleDateString()}`;

    return this.prisma.clinicalConversation.create({
      data: {
        userId,
        title,
        messages: {
          create: [
            {
              role: 'user',
              content: query
            },
            {
              role: 'assistant',
              content: 'Here is the clinical analysis based on your case.',
              metadata: insights as any
            }
          ]
        }
      }
    });
  }

  /**
   * Extract case parameters using OpenAI directly
   */
  private async extractCaseParameters(query: string): Promise<CaseParameters> {
    const prompt = `Extract clinical case parameters from this query. Return as JSON.
    
Query: "${query}"

Extract:
- age (if mentioned, as string)
- diagnosis (array of conditions/diagnoses)
- interventions (array of treatments tried)
- challenges (array of difficulties mentioned)
- goals (array of treatment goals)

Return ONLY valid JSON, no markdown. Example:
{"age": "8", "diagnosis": ["ASD", "ADHD"], "interventions": ["ABA"], "challenges": ["aggression"], "goals": ["communication"]}`;

    try {
      // Use OpenAI directly
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Failed to extract case parameters:', error);
      return {
        diagnosis: [],
        interventions: [],
        challenges: [],
        goals: [],
      };
    }
  }

  /**
   * Find similar cases using vector search
   */
  private async findSimilarCases(
    query: string,
    caseParams: CaseParameters,
    excludeUserId: string,
    precomputedEmbedding?: number[],
  ): Promise<SimilarCase[]> {
    try {
      const embedding = precomputedEmbedding && precomputedEmbedding.length > 0
        ? precomputedEmbedding
        : await this.aiService.generateEmbedding(query);

      if (!embedding || embedding.length === 0) {
        this.logger.warn('No embedding generated, using mock data');
        return this.getMockSimilarCases(caseParams);
      }

      // Search using pgvector
      const similarPosts = await this.prisma.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.title,
          p.content,
          p."createdAt",
          u.name as "authorName",
          u.role as "authorRole",
          u."yearsOfExperience",
          1 - (p.embedding::vector <=> ${embedding}::vector) as similarity
        FROM "Post" p
        JOIN "User" u ON p."authorId" = u.id
        WHERE 
          p."authorId" != ${excludeUserId}
          AND p."moderationStatus" = 'APPROVED'
          AND p.embedding IS NOT NULL
        ORDER BY p.embedding::vector <=> ${embedding}::vector
        LIMIT 5
      `.catch(error => {
        this.logger.error('Vector search failed, using fallback:', error);
        return [];
      });

      if (!similarPosts || similarPosts.length === 0) {
        // Only return mock data if we absolutely have to, but log it clearly
        this.logger.warn('No similar cases found in DB. Returning empty list to avoid fake data.');
        return [];
      }

      // Transform and anonymize results with LLM-backed redaction
      return Promise.all(
        similarPosts.map(async (post) => ({
          id: post.id,
          title: post.title,
          content: (await this.aiService.redactSensitiveInfo(post.content)).substring(0, 200) + '...',
          authorName: post.authorName || 'Anonymous Professional',
          authorRole: this.formatRole(post.authorRole),
          similarity: post.similarity,
          relevanceExplanation: this.explainRelevance(post, caseParams),
          yearsOfExperience: post.yearsOfExperience,
        }))
      );

    } catch (error) {
      this.logger.error('Error finding similar cases:', error);
      return [];
    }
  }

  /**
   * Search PubMed for relevant research
   */
  private async searchPubMed(caseParams: CaseParameters): Promise<PubMedArticle[]> {
    try {
      // Build search query using LLM for better relevance
      const searchTerms = await this.generatePubMedQuery(caseParams);
      this.logger.debug(`PubMed search query: ${searchTerms}`);

      // Step 1: Search for article IDs
      const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
      const searchResponse = await axios.get(searchUrl, {
        params: {
          db: 'pubmed',
          term: searchTerms,
          retmax: 10,
          retmode: 'json',
          sort: 'relevance',
        },
        timeout: 5000,
      });

      const pmids = searchResponse.data?.esearchresult?.idlist || [];

      if (pmids.length === 0) {
        this.logger.warn('No PubMed articles found with complex query, trying simple fallback');
        // Fallback to simple query
        const simpleQuery = caseParams.diagnosis.join(' OR ');
        const simpleResponse = await axios.get(searchUrl, {
          params: {
            db: 'pubmed',
            term: simpleQuery,
            retmax: 5,
            retmode: 'json',
            sort: 'relevance',
          },
          timeout: 5000,
        });
        const simplePmids = simpleResponse.data?.esearchresult?.idlist || [];
        if (simplePmids.length === 0) return []; // Return empty instead of fake

        // Use simple results
        return this.fetchPubMedDetails(simplePmids, caseParams);
      }

      return this.fetchPubMedDetails(pmids, caseParams);



    } catch (error) {
      this.logger.error('PubMed search failed:', error);
      return []; // Return empty instead of fake
    }
  }

  private async generatePubMedQuery(caseParams: CaseParameters): Promise<string> {
    const prompt = `Generate a PubMed search query for a patient with:
      Diagnosis: ${caseParams.diagnosis.join(', ')}
      Interventions: ${caseParams.interventions.join(', ')}
      Challenges: ${caseParams.challenges.join(', ')}
      
      Return ONLY the search string. Use MeSH terms where possible. Use AND/OR operators. 
      Focus on PRACTICAL CLINICAL INTERVENTIONS, MANAGEMENT STRATEGIES, and THERAPIES.
      Avoid purely genetic or molecular research unless directly relevant to treatment.
      Example: ("Autism Spectrum Disorder/therapy"[MeSH] OR "Autism/rehabilitation"[MeSH]) AND ("Sensory Integration"[MeSH] OR "Sensory Processing")
      `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });
      return response.choices[0]?.message?.content?.trim() || caseParams.diagnosis.join(' AND ');
    } catch (e) {
      return caseParams.diagnosis.join(' AND ');
    }
  }

  private async fetchPubMedDetails(pmids: string[], caseParams: CaseParameters): Promise<PubMedArticle[]> {
    // Step 2: Fetch article details
    const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
    const fetchResponse = await axios.get(fetchUrl, {
      params: {
        db: 'pubmed',
        id: pmids.join(','),
        rettype: 'abstract',
        retmode: 'xml',
      },
      timeout: 5000,
    });

    // Parse XML response
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(fetchResponse.data);

    const articles = this.parsePubMedResults(result);
    return this.rankArticles(articles, caseParams);
  }

  /**
   * Parse PubMed XML results
   */
  private parsePubMedResults(xmlData: any): PubMedArticle[] {
    const articles: PubMedArticle[] = [];

    try {
      const pubmedArticles = xmlData?.PubmedArticleSet?.PubmedArticle || [];

      for (const article of pubmedArticles) {
        const medline = article.MedlineCitation?.[0];
        if (!medline) continue;

        const pmid = medline.PMID?.[0]?._ || medline.PMID?.[0];
        const articleData = medline.Article?.[0];

        if (pmid && articleData) {
          articles.push({
            pmid: String(pmid),
            title: articleData.ArticleTitle?.[0] || 'No title',
            abstract: this.extractAbstract(articleData.Abstract),
            authors: this.extractAuthors(articleData.AuthorList),
            journal: articleData.Journal?.[0]?.Title?.[0] || 'Unknown Journal',
            year: medline.DateCreated?.[0]?.Year?.[0] || '2024',
            doi: articleData.ELocationID?.find((id: any) => id.$?.EIdType === 'doi')?._,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error parsing PubMed XML:', error);
    }

    return articles;
  }

  /**
   * Extract abstract text from PubMed XML
   */
  private extractAbstract(abstractData: any): string {
    if (!abstractData?.[0]) return 'No abstract available';

    const abstractTexts = abstractData[0].AbstractText;
    if (!abstractTexts) return 'No abstract available';

    return abstractTexts.map((text: any) => {
      if (typeof text === 'string') return text;
      return text._ || '';
    }).join(' ').substring(0, 500) + '...';
  }

  /**
   * Extract authors from PubMed XML
   */
  private extractAuthors(authorList: any): string[] {
    if (!authorList?.[0]?.Author) return [];

    return authorList[0].Author.slice(0, 3).map((author: any) => {
      const lastName = author.LastName?.[0] || '';
      const initials = author.Initials?.[0] || '';
      return `${lastName} ${initials}`.trim();
    });
  }

  /**
   * Generate detailed evidence-based recommendations using OpenAI
   */
  private async generateRecommendations(query: string, caseParams: CaseParameters) {
    const prompt = `You are an expert clinical advisor specializing in Indian healthcare context.

Case Details:
- Age: ${caseParams.age || 'Not specified'}
- Diagnoses: ${caseParams.diagnosis.join(', ')}
- Interventions Tried: ${caseParams.interventions.join(', ')}
- Current Challenges: ${caseParams.challenges.join(', ')}
- Goals: ${caseParams.goals?.join(', ') || 'Not specified'}

Generate 3-5 detailed, actionable recommendations in this EXACT JSON format:
{
  "recommendations": [
    {
      "title": "Brief recommendation title (60 chars max)",
      "description": "Detailed 150-250 word explanation covering what it is, how it works, why relevant, and expected outcomes",
      "actionSteps": [
        "Detailed, elaborative step 1 (2-3 sentences explaining exactly what to do)",
        "Detailed, elaborative step 2 (2-3 sentences explaining exactly what to do)",
        "Detailed, elaborative step 3 (2-3 sentences explaining exactly what to do)"
      ],
      "priority": "high|medium|low",
      "timeline": "Expected timeline for results (e.g., '4-6 weeks', '3 months')",
      "availability": {
        "india": true,
        "telehealth": true,
        "languages": ["English", "Hindi"]
      },
      "costEstimate": "INR range or 'Free' or 'Varies'"
    }
  ],
  "alternatives": [
    {
      "title": "Alternative approach title",
      "description": "Brief description of this alternative",
      "actionSteps": ["Step 1", "Step 2"],
      "priority": "medium|low",
      "timeline": "Timeline estimate",
      "availability": {
        "india": true,
        "telehealth": false,
        "languages": ["English"]
      },
      "costEstimate": "Cost estimate"
    }
  ]
}

Requirements:
- India-specific and culturally appropriate
- Include RCI/NCERT guidelines where applicable
- Mention availability in tier-2/tier-3 cities
- Cost estimates in INR
- Specify telehealth availability
- List language availability
- Consider accessibility for lower-income families
- Include government schemes where applicable (NIMH, CDPO, etc.)

Return ONLY valid JSON, no markdown.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      return {
        recommendations: parsed.recommendations || [],
        alternatives: parsed.alternatives || []
      };
    } catch (error) {
      this.logger.error('Failed to generate detailed recommendations:', error);
      return this.getFallbackRecommendations(caseParams);
    }
  }

  private getFallbackRecommendations(caseParams: CaseParameters) {
    return {
      recommendations: [
        {
          title: 'Comprehensive Multidisciplinary Assessment',
          description: 'Schedule a complete evaluation with a team including developmental pediatrician, speech therapist, and occupational therapist. This assessment will identify specific areas of need and create a baseline for measuring progress. The team will use standardized tools appropriate for the child\'s age and condition to evaluate cognitive, motor, social, and communication skills.',
          actionSteps: [
            'Contact a developmental pediatrician or child psychologist for initial consultation',
            'Request referrals to speech-language pathologist and occupational therapist',
            'Schedule assessments within 2-4 weeks if possible',
            'Gather all previous medical records and intervention reports',
            'Prepare list of specific concerns and questions for the team'
          ],
          priority: 'high' as const,
          timeline: '2-4 weeks for complete assessment',
          availability: {
            india: true,
            telehealth: true,
            languages: ['English', 'Hindi', 'Regional languages']
          },
          costEstimate: 'INR 5,000-15,000 depending on location and provider'
        },
        {
          title: 'Evidence-Based Behavioral Intervention Program',
          description: 'Implement a structured behavioral intervention program tailored to the child\'s specific needs. This typically involves Applied Behavior Analysis (ABA) principles combined with naturalistic teaching strategies. Focus on functional communication, daily living skills, and reducing challenging behaviors through positive reinforcement.',
          actionSteps: [
            'Find a certified ABA therapist or behavioral consultant',
            'Start with 10-15 hours per week of therapy',
            'Include parent training sessions to maintain consistency at home',
            'Set specific, measurable goals for 3-month intervals',
            'Monitor progress weekly and adjust strategies as needed'
          ],
          priority: 'high' as const,
          timeline: '8-12 weeks to see initial improvements',
          availability: {
            india: true,
            telehealth: true,
            languages: ['English', 'Hindi', 'Tamil', 'Marathi']
          },
          costEstimate: 'INR 800-2,000 per session; some NGOs offer subsidized rates'
        },
        {
          title: 'Augmentative and Alternative Communication (AAC)',
          description: 'Introduce communication tools and strategies to support language development and reduce frustration. This can range from low-tech picture cards (PECS) to high-tech speech-generating devices or apps. AAC doesn\'t replace speech development but provides immediate ways to communicate needs and wants.',
          actionSteps: [
            'Consult with speech-language pathologist specializing in AAC',
            'Start with simple picture exchange or basic AAC app on tablet',
            'Train all family members and caregivers on consistent use',
            'Practice in natural daily routines (meals, play, bath time)',
            'Gradually increase vocabulary and complexity'
          ],
          priority: 'medium' as const,
          timeline: '4-8 weeks to establish basic communication',
          availability: {
            india: true,
            telehealth: true,
            languages: ['Visual system - language independent']
          },
          costEstimate: 'Low-tech: INR 500-2,000; Apps: Free-5,000; Devices: INR 20,000-80,000'
        }
      ],
      alternatives: [
        {
          title: 'Sensory Integration Therapy',
          description: 'Occupational therapy approach focusing on how the child processes sensory information. Helps with sensory sensitivities and improves ability to regulate responses to sensory input.',
          actionSteps: [
            'Find OT trained in sensory integration',
            'Create sensory diet for home',
            'Set up sensory-friendly space at home'
          ],
          priority: 'medium' as const,
          timeline: '6-12 weeks',
          availability: {
            india: true,
            telehealth: false,
            languages: ['English', 'Hindi']
          },
          costEstimate: 'INR 800-1,500 per session'
        },
        {
          title: 'Parent-Mediated Early Intervention',
          description: 'Training parents to deliver therapeutic interventions during daily routines. Research shows this can be highly effective and more affordable than intensive clinic-based therapy.',
          actionSteps: [
            'Enroll in parent training workshop',
            'Practice strategies during daily activities',
            'Join parent support group'
          ],
          priority: 'medium' as const,
          timeline: '3-6 months',
          availability: {
            india: true,
            telehealth: true,
            languages: ['English', 'Hindi', 'Regional languages']
          },
          costEstimate: 'INR 2,000-10,000 for workshop series; some free government programs'
        }
      ]
    };
  }

  /**
   * Find relevant experts on the platform
   */
  private async findRelevantExperts(
    caseParams: CaseParameters,
    queryEmbedding?: number[],
  ): Promise<ExpertConnection[]> {
    try {
      const keywords = [
        ...(caseParams.diagnosis || []),
        ...(caseParams.challenges || []),
        ...(caseParams.goals || []),
      ].map(k => k.toLowerCase());

      if (keywords.length === 0) return [];

      // Fetch a broader set of verified professionals to rank
      const experts = await this.prisma.user.findMany({
        where: {
          role: { in: ['THERAPIST', 'EDUCATOR'] },
          verificationStatus: 'VERIFIED',
          specialization: { isEmpty: false },
        },
        select: {
          id: true,
          name: true,
          role: true,
          specialization: true,
          yearsOfExperience: true,
          reputation: true,
          trustScore: true,
          organization: true,
          _count: { select: { posts: true, comments: true } },
        },
        take: 20,
      });

      // Score each expert by specialization overlap with case keywords
      let scored = experts.map(expert => {
        const specs = (expert.specialization || []).map(s => s.toLowerCase());
        const overlapCount = keywords.filter(k =>
          specs.some(s => s.includes(k) || k.includes(s))
        ).length;
        const relevanceScore = overlapCount / Math.max(keywords.length, 1);
        return { ...expert, relevanceScore };
      });

      // If embedding available, boost with vector similarity
      if (queryEmbedding && queryEmbedding.length > 0) {
        try {
          const vectorResults = await this.prisma.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT id, 1 - (embedding_vector <=> ${queryEmbedding}::vector) as similarity
            FROM "User"
            WHERE role IN ('THERAPIST', 'EDUCATOR')
              AND "verificationStatus" = 'VERIFIED'
              AND embedding_vector IS NOT NULL
            ORDER BY embedding_vector <=> ${queryEmbedding}::vector
            LIMIT 10
          `;
          const similarityMap = new Map(vectorResults.map(r => [r.id, r.similarity]));
          scored = scored.map(expert => ({
            ...expert,
            relevanceScore: expert.relevanceScore + (similarityMap.get(expert.id) || 0) * 0.5,
          }));
        } catch (err) {
          this.logger.warn('Vector expert matching failed, using keyword matching only:', err);
        }
      }

      // Sort by relevance, then trust score
      scored.sort((a, b) => (b.relevanceScore - a.relevanceScore) || (b.trustScore - a.trustScore));

      return scored.slice(0, 5).map(expert => ({
        id: expert.id,
        name: expert.name || 'Healthcare Professional',
        role: expert.role,
        specialization: expert.specialization || [],
        yearsOfExperience: expert.yearsOfExperience || 0,
        trustScore: expert.trustScore,
        organization: expert.organization === null ? undefined : expert.organization,
        _count: expert._count,
      }));
    } catch (error) {
      this.logger.error('Error finding experts:', error);
      return [];
    }
  }

  /**
   * Find relevant communities on the platform
   */
  private async findRelevantCommunities(caseParams: CaseParameters): Promise<RelevantCommunity[]> {
    try {
      // Extract keywords for search
      const keywords = [
        ...(caseParams.diagnosis || []),
        ...(caseParams.challenges || [])
      ].map(k => k.toLowerCase());

      if (keywords.length === 0) {
        // Fallback to general support communities if no keywords
        const generalCommunities = await this.prisma.community.findMany({
          where: {
            tags: { hasSome: ['support', 'general', 'parenting'] }
          },
          take: 3,
          orderBy: { memberCount: 'desc' },
        });

        return generalCommunities.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          memberCount: c.memberCount,
          matchReason: 'General Support Community',
          tags: c.tags,
        }));
      }

      // Find communities matching diagnosis or challenges tags
      const communities = await this.prisma.community.findMany({
        where: {
          OR: [
            // Match keywords in tags (case insensitive handled by having lowercase tags usually)
            { tags: { hasSome: keywords } },
            // Or description contains keyword (basic search)
            {
              OR: keywords.map(k => ({
                description: { contains: k, mode: 'insensitive' }
              }))
            },
            // Or name contains keyword
            {
              OR: keywords.map(k => ({
                name: { contains: k, mode: 'insensitive' }
              }))
            }
          ]
        },
        take: 5,
        orderBy: { memberCount: 'desc' },
      });

      if (communities.length === 0) {
        // Fallback if no specific matches
        const popularCommunities = await this.prisma.community.findMany({
          take: 3,
          orderBy: { memberCount: 'desc' },
        });

        return popularCommunities.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          memberCount: c.memberCount,
          matchReason: 'Popular Community',
          tags: c.tags,
        }));
      }

      return communities.map(c => {
        // Determine match reason
        const matchedTags = c.tags.filter(t => keywords.some(k => k.includes(t.toLowerCase()) || t.toLowerCase().includes(k)));
        const reason = matchedTags.length > 0
          ? `Matches ${matchedTags[0]} interest`
          : 'Relevant topic';

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          memberCount: c.memberCount,
          matchReason: reason,
          tags: c.tags,
        };
      });
    } catch (error) {
      this.logger.error('Error finding communities:', error);
      return [];
    }
  }

  private async findRelevantOrganizations(caseParams: CaseParameters): Promise<any[]> {
    try {
      const keywords = [
        ...(caseParams.diagnosis || []),
        ...(caseParams.challenges || []),
        ...(caseParams.goals || []),
      ].map(k => k.toLowerCase());

      // Search organizations whose communities match the case keywords
      const orgs = await this.prisma.organization.findMany({
        where: {
          communities: {
            some: {
              OR: [
                ...(keywords.length > 0 ? [{ tags: { hasSome: keywords } }] : []),
                ...keywords.map(k => ({
                  name: { contains: k, mode: 'insensitive' as const },
                })),
                ...keywords.map(k => ({
                  description: { contains: k, mode: 'insensitive' as const },
                })),
              ],
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          website: true,
          _count: { select: { communities: true, members: true } },
        },
        take: 5,
      });

      if (orgs.length === 0) {
        // Fallback: return orgs with the most communities
        const popularOrgs = await this.prisma.organization.findMany({
          orderBy: { communities: { _count: 'desc' } },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
            website: true,
            _count: { select: { communities: true, members: true } },
          },
          take: 3,
        });
        return popularOrgs;
      }

      return orgs;
    } catch (error) {
      this.logger.error('Error finding relevant organizations:', error);
      return [];
    }
  }

  /**
   * Mock similar cases fallback for demo
   */
  private getMockSimilarCases(caseParams: CaseParameters): SimilarCase[] {
    const diagnosis = caseParams.diagnosis[0] || 'ASD';
    return [
      {
        title: `Success with PECS for non-verbal ${diagnosis} child`,
        content: 'We saw breakthrough after introducing PECS system alongside modified approach...',
        authorName: 'Dr. Sarah Chen',
        authorRole: 'Speech Therapist',
        similarity: 0.89,
        relevanceExplanation: 'Similar diagnosis and successful intervention',
      },
      {
        title: `Alternative approaches for ${diagnosis}`,
        content: 'Found that incorporating play-based approach helped with engagement...',
        authorName: 'Mark Thompson',
        authorRole: 'Behavioral Therapist',
        similarity: 0.85,
        relevanceExplanation: 'Alternative intervention strategy',
      },
    ];
  }

  // HELPER METHODS

  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'THERAPIST': 'Licensed Therapist',
      'EDUCATOR': 'Special Educator',
      'USER': 'Community Member',
      'ORGANIZATION': 'Healthcare Organization',
    };
    return roleMap[role] || role;
  }

  private explainRelevance(post: any, caseParams: CaseParameters): string {
    const diagnosisMatch = caseParams.diagnosis.some(d =>
      post.content.toLowerCase().includes(d.toLowerCase())
    );

    if (diagnosisMatch) {
      return `Similar diagnosis and treatment context`;
    }

    const challengeMatch = caseParams.challenges.some(c =>
      post.content.toLowerCase().includes(c.toLowerCase())
    );

    if (challengeMatch) {
      return `Addresses similar challenges`;
    }

    return `Related therapeutic approach`;
  }

  private mapDiagnosisToSpecializations(diagnoses: string[]): string[] {
    const mappings: Record<string, string[]> = {
      'ASD': ['Autism Specialist', 'ABA Therapy', 'Behavioral Therapy'],
      'autism': ['Autism Specialist', 'Developmental Therapy', 'Speech Therapy'],
      'ADHD': ['ADHD Specialist', 'Behavioral Therapy', 'Child Psychology'],
      'anxiety': ['Mental Health', 'CBT', 'Child Psychology'],
      'dyslexia': ['Learning Disabilities', 'Special Education'],
      'down syndrome': ['Developmental Disabilities', 'Early Intervention'],
      'cerebral palsy': ['Physical Therapy', 'Occupational Therapy'],
      'sensory': ['Occupational Therapy', 'Sensory Integration'],
      'spd': ['Occupational Therapy', 'Sensory Integration'],
      'neurodivergent': ['Autism Specialist', 'Child Psychology', 'Developmental Therapy'],
      'speech': ['Speech Therapy', 'SLP'],
      'language': ['Speech Therapy', 'SLP'],
      'behavior': ['Behavioral Therapy', 'ABA Therapy', 'Child Psychology'],
    };

    const specs = new Set<string>();
    for (const diagnosis of diagnoses) {
      const key = diagnosis.toLowerCase();
      const matched = mappings[key] || [];
      matched.forEach(s => specs.add(s));
    }

    return Array.from(specs);
  }

  private calculateConfidence(similarCases: any[], articles: any[]): number {
    const caseScore = Math.min(similarCases.length * 0.15, 0.45);
    const articleScore = Math.min(articles.length * 0.1, 0.5);
    return Math.min(0.95, 0.5 + caseScore + articleScore);
  }

  private compileCitations(articles: PubMedArticle[]): string[] {
    return articles.map(article =>
      `${article.authors.join(', ')} (${article.year}). ${article.title}. ${article.journal}.`
    );
  }

  private rankArticles(articles: PubMedArticle[], caseParams: CaseParameters): PubMedArticle[] {
    return articles.map(article => {
      let score = 0;
      const text = `${article.title} ${article.abstract}`.toLowerCase();

      caseParams.diagnosis.forEach(d => {
        if (text.includes(d.toLowerCase())) score += 0.3;
      });

      caseParams.interventions.forEach(i => {
        if (text.includes(i.toLowerCase())) score += 0.2;
      });

      const year = parseInt(article.year);
      if (year >= 2023) score += 0.2;
      else if (year >= 2020) score += 0.1;

      return { ...article, relevanceScore: Math.min(score, 1) };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private getFallbackArticles(caseParams: CaseParameters): PubMedArticle[] {
    const diagnosis = caseParams.diagnosis[0] || 'autism';
    return [
      {
        pmid: '00000001',
        title: `Evidence-Based Interventions for ${diagnosis}: Clinical Guidelines`,
        abstract: 'This article reviews current evidence-based practices...',
        authors: ['Smith J', 'Johnson K'],
        journal: 'Journal of Clinical Practice',
        year: '2024',
        relevanceScore: 0.85,
      },
    ];
  }

  private async logAgentUsage(userId: string, query: string, insights: ClinicalInsight) {
    try {
      await this.prisma.analytics.create({
        data: {
          userId,
          event: 'clinical_insights_generated',
          metadata: {
            query: query.substring(0, 200),
            diagnoses: insights.caseAnalysis.diagnosis,
            articlesFound: insights.researchArticles.length,
            casesFound: insights.similarCases.length,
            confidence: insights.confidence,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log analytics:', error);
    }
  }

  // Add a simplification method
  async simplifyContent(content: string): Promise<string> {
    // Use GPT to simplify medical language
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'Simplify this medical text for parents. Use simple words, short sentences, and avoid jargon.'
      }, {
        role: 'user',
        content: content
      }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || content;
  }
}