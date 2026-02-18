// apps/api/src/agents/clinical-insights.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import OpenAI from 'openai';
import axios from 'axios';
import * as xml2js from 'xml2js';
import {
  CaseParameters,
  PubMedArticle,
  ClinicalInsight,
  SimilarCase,
  ExpertConnection,
  RelevantCommunity,
  RelevantPost,
  StreamProgressEvent,
  EnrichedClinicalInsight,
  AnalyzeAssessmentDto,
  OverallAssessment,
  DomainAnalysisItem,
  ClinicalCorrelation,
  StrategicRoadmap,
} from './clinical-insights.types';

@Injectable()
export class ClinicalInsightsService {
  private readonly logger = new Logger(ClinicalInsightsService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private aiService: AiService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assessment-based analysis (new wizard flow)
  // ─────────────────────────────────────────────────────────────────────────

  async analyzeAssessment(
    dto: AnalyzeAssessmentDto,
    userId: string,
  ): Promise<EnrichedClinicalInsight & { conversationId: string }> {
    this.logger.log(`Analyzing assessment ${dto.assessmentId} for user ${userId}`);

    // 1. Fetch child + assessment data
    const [child, assessment] = await Promise.all([
      this.prisma.child.findUnique({
        where: { id: dto.childId },
        include: { conditions: true },
      }),
      this.prisma.assessment.findUnique({
        where: { id: dto.assessmentId },
        include: {
          reports: { where: { reportType: 'ENHANCED' }, take: 1 },
        },
      }),
    ]);

    if (!child) throw new Error('Child not found');
    if (!assessment) throw new Error('Assessment not found');

    // 2. Calculate child age
    const dob = new Date(child.dateOfBirth);
    const now = new Date();
    let ageYears = now.getFullYear() - dob.getFullYear();
    let ageMonths = now.getMonth() - dob.getMonth();
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
    const ageStr = ageMonths > 0
      ? `${ageYears} years, ${ageMonths} months`
      : `${ageYears} years`;

    // 3. Build case parameters from assessment data
    const conditions = (child.conditions || []).map(c => c.conditionType || c.specificDiagnosis || '').filter(Boolean);
    const therapies = (child.conditions || []).flatMap(c => c.currentTherapies || []);
    const challenges = (child.conditions || []).map(c => c.primaryChallenges || '').filter(Boolean);
    const flaggedDomains = assessment.flaggedDomains || [];

    const caseParams: CaseParameters = {
      age: ageStr,
      diagnosis: conditions.length > 0 ? conditions : flaggedDomains,
      interventions: therapies,
      challenges: [...challenges, ...flaggedDomains.map(d => `${d} concerns`)],
      goals: dto.focusAreas || [],
    };

    // 4. Build domain scores map for AI analysis
    const domainScores = assessment.domainScores as Record<string, { riskIndex: number; status: string }> | null;

    // 5. Run comprehensive AI analysis + standard pipeline in parallel
    const query = this.buildAssessmentQuery(child, assessment, dto.context, dto.focusAreas);
    const [comprehensiveResult, queryEmbedding] = await Promise.all([
      this.generateComprehensiveAnalysis(child, assessment, domainScores, dto.context, dto.focusAreas),
      this.aiService.generateEmbedding(query).catch(() => [] as number[]),
    ]);

    const [similarCases, researchArticles, recommendations, expertConnections, communities, organizations] = await Promise.all([
      this.findSimilarCases(query, caseParams, userId, queryEmbedding),
      this.searchPubMed(caseParams),
      this.generateRecommendations(query, caseParams),
      this.findRelevantExperts(caseParams, queryEmbedding),
      this.findRelevantCommunities(caseParams),
      this.findRelevantOrganizations(caseParams),
    ]);

    // 6. Compile enriched insights
    const insights: EnrichedClinicalInsight = {
      caseAnalysis: caseParams,
      similarCases: similarCases.slice(0, 3),
      researchArticles: researchArticles.slice(0, 5),
      evidenceBasedRecommendations: recommendations.recommendations,
      alternativeApproaches: recommendations.alternatives,
      expertConnections: expertConnections.slice(0, 3),
      communities: communities.slice(0, 3),
      organizations: organizations.slice(0, 5),
      confidence: this.calculateConfidence(similarCases, researchArticles),
      citations: this.compileCitations(researchArticles),
      overallAssessment: comprehensiveResult.overallAssessment,
      domainAnalysis: comprehensiveResult.domainAnalysis,
      clinicalCorrelations: comprehensiveResult.clinicalCorrelations,
      strategicRoadmap: comprehensiveResult.strategicRoadmap,
      child: {
        id: child.id,
        name: child.firstName,
        age: ageStr,
        dateOfBirth: child.dateOfBirth.toISOString(),
      },
      assessmentId: dto.assessmentId,
      assessmentDate: assessment.completedAt?.toISOString() || assessment.createdAt.toISOString(),
    };

    // 7. Save conversation
    const conversation = await this.saveConversation(userId, query, insights);
    await this.logAgentUsage(userId, query, insights);

    return { ...insights, conversationId: conversation.id };
  }

  private buildAssessmentQuery(
    child: any,
    assessment: any,
    context?: string,
    focusAreas?: string[],
  ): string {
    const parts: string[] = [];
    parts.push(`Child: ${child.firstName}, Age: ${child.dateOfBirth}`);
    parts.push(`Assessment status: ${assessment.status}`);
    if (assessment.overallScore != null) {
      parts.push(`Overall score: ${Math.round(assessment.overallScore)}%`);
    }
    if (assessment.flaggedDomains?.length > 0) {
      parts.push(`Flagged domains: ${assessment.flaggedDomains.join(', ')}`);
    }
    if (context) parts.push(`Additional context: ${context}`);
    if (focusAreas?.length) parts.push(`Focus areas: ${focusAreas.join(', ')}`);
    return parts.join('. ');
  }

  private async generateComprehensiveAnalysis(
    child: any,
    assessment: any,
    domainScores: Record<string, { riskIndex: number; status: string }> | null,
    context?: string,
    focusAreas?: string[],
  ): Promise<{
    overallAssessment: OverallAssessment;
    domainAnalysis: DomainAnalysisItem[];
    clinicalCorrelations: ClinicalCorrelation[];
    strategicRoadmap: StrategicRoadmap;
  }> {
    const domainSummary = domainScores
      ? Object.entries(domainScores).map(([key, val]) => {
          const score = Math.round((1 - val.riskIndex) * 100);
          return `- ${key}: ${score}% (${val.status})`;
        }).join('\n')
      : 'No domain scores available';

    const conditions = (child.conditions || []).map((c: any) =>
      `${c.conditionType}${c.specificDiagnosis ? ` (${c.specificDiagnosis})` : ''}${c.severity ? `, severity: ${c.severity}` : ''}`
    ).join('; ') || 'None documented';

    const prompt = `You are a senior developmental assessment analyst specializing in pediatric development.

Analyze this child's developmental screening data and provide a comprehensive clinical insight.

CHILD PROFILE:
- Name: ${child.firstName}
- Age: ${child.dateOfBirth ? new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear() : 'Unknown'} years
- Gender: ${child.gender || 'Not specified'}
- Diagnosed conditions: ${conditions}
${child.developmentalConcerns ? `- Developmental concerns: ${child.developmentalConcerns}` : ''}
${child.learningDifficulties ? `- Learning difficulties: ${child.learningDifficulties}` : ''}
${child.teacherConcerns ? `- Teacher concerns: ${child.teacherConcerns}` : ''}
${child.prematureBirth ? `- Born premature at ${child.gestationalAge || 'unknown'} weeks` : ''}
${child.sleepIssues ? `- Sleep issues: ${child.sleepDetails || 'Yes'}` : ''}
${child.takingMedications ? `- Medications: ${child.medicationDetails || 'Yes'}` : ''}

SCREENING RESULTS:
- Overall Score: ${assessment.overallScore != null ? Math.round(assessment.overallScore) + '%' : 'Not available'}
- Flagged Domains: ${(assessment.flaggedDomains || []).join(', ') || 'None'}
- Domain Scores:
${domainSummary}

${context ? `ADDITIONAL PARENT CONTEXT: ${context}` : ''}
${focusAreas?.length ? `FOCUS AREAS REQUESTED: ${focusAreas.join(', ')}` : ''}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "overallAssessment": {
    "riskLevel": "low|moderate|high",
    "developmentalAge": "estimated developmental age equivalent if determinable, or null",
    "headline": "One-sentence headline finding about the child's development",
    "summary": "Two-paragraph comprehensive summary of the screening results, contextualizing the findings with the child's history and profile. Frame positively while being honest about areas of concern."
  },
  "domainAnalysis": [
    {
      "domain": "Domain Name",
      "score": 75,
      "status": "on-track|monitor|concern",
      "clinicalAnalysis": "Detailed paragraph analyzing this domain in context of the child's history, conditions, and profile. Reference specific data points.",
      "impact": "How this domain's performance affects daily life, school, and developmental trajectory. Contrast supported vs unsupported paths."
    }
  ],
  "clinicalCorrelations": [
    {
      "title": "Correlation title (e.g. 'Motor-Language Connection')",
      "relatedHistory": "Related historical/medical factor",
      "insight": "Clinical interpretation of how these factors connect and what it means for the child's development"
    }
  ],
  "strategicRoadmap": {
    "shortTerm": [
      {"area": "Focus area", "action": "Specific action to take", "reason": "Why this is important now"}
    ],
    "mediumTerm": [
      {"area": "Focus area", "action": "Action for 3-6 months", "reason": "Expected benefit"}
    ],
    "longTerm": [
      {"area": "Focus area", "action": "Long-term goal", "reason": "Developmental trajectory impact"}
    ]
  }
}

RULES:
- Include analysis for EVERY domain present in the screening results
- Map domain status: GREEN = "on-track", YELLOW = "monitor", RED = "concern"
- Generate 3-5 clinical correlations connecting history to current findings
- Frame findings as support pathways, NOT diagnoses
- Use empathetic, parent-friendly language while being clinically accurate
- Reference specific data points from the profile
- Strategic roadmap: 2-3 items per phase`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        overallAssessment: parsed.overallAssessment || this.getDefaultOverallAssessment(assessment),
        domainAnalysis: parsed.domainAnalysis || this.getDefaultDomainAnalysis(domainScores),
        clinicalCorrelations: parsed.clinicalCorrelations || [],
        strategicRoadmap: parsed.strategicRoadmap || { shortTerm: [], mediumTerm: [], longTerm: [] },
      };
    } catch (error) {
      this.logger.error('Failed to generate comprehensive analysis:', error);
      return {
        overallAssessment: this.getDefaultOverallAssessment(assessment),
        domainAnalysis: this.getDefaultDomainAnalysis(domainScores),
        clinicalCorrelations: [],
        strategicRoadmap: { shortTerm: [], mediumTerm: [], longTerm: [] },
      };
    }
  }

  private getDefaultOverallAssessment(assessment: any): OverallAssessment {
    const score = assessment.overallScore;
    const flagged = assessment.flaggedDomains?.length || 0;
    let riskLevel: 'low' | 'moderate' | 'high' = 'low';
    if (flagged >= 3 || (score != null && score < 50)) riskLevel = 'high';
    else if (flagged >= 1 || (score != null && score < 70)) riskLevel = 'moderate';

    return {
      riskLevel,
      headline: flagged > 0
        ? `${flagged} developmental domain${flagged > 1 ? 's' : ''} flagged for attention`
        : 'Development appears largely on track',
      summary: 'This screening provides an overview of developmental progress across multiple domains. Please consult with a qualified professional for comprehensive evaluation and personalized guidance.',
    };
  }

  private getDefaultDomainAnalysis(
    domainScores: Record<string, { riskIndex: number; status: string }> | null,
  ): DomainAnalysisItem[] {
    if (!domainScores) return [];
    return Object.entries(domainScores).map(([key, val]) => {
      const score = Math.round((1 - val.riskIndex) * 100);
      const statusMap: Record<string, 'on-track' | 'monitor' | 'concern'> = {
        GREEN: 'on-track', YELLOW: 'monitor', RED: 'concern',
      };
      return {
        domain: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
        score,
        status: statusMap[val.status] || 'monitor',
        clinicalAnalysis: 'Detailed analysis requires AI generation.',
        impact: 'Impact assessment requires AI generation.',
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Free-text analysis (original flow)
  // ─────────────────────────────────────────────────────────────────────────

  async generateInsights(query: string, userId: string): Promise<ClinicalInsight & { conversationId: string }> {
    try {
      this.logger.log(`Generating clinical insights for user ${userId}`);

      const [caseParams, queryEmbedding] = await Promise.all([
        this.extractCaseParameters(query),
        this.aiService.generateEmbedding(query).catch(() => [] as number[]),
      ]);
      this.logger.debug('Extracted case parameters:', caseParams);

      const [similarCases, researchArticles, recommendations, expertConnections, communities, organizations] = await Promise.all([
        this.findSimilarCases(query, caseParams, userId, queryEmbedding),
        this.searchPubMed(caseParams),
        this.generateRecommendations(query, caseParams),
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

      const conversation = await this.saveConversation(userId, query, insights);
      await this.logAgentUsage(userId, query, insights);

      return { ...insights, conversationId: conversation.id };
    } catch (error) {
      this.logger.error('Failed to generate insights:', error);
      throw error;
    }
  }

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

      const [similarCases, researchArticles, communities, organizations] = await Promise.all([
        this.findSimilarCases(query, caseParams, userId, queryEmbedding),
        this.searchPubMed(caseParams),
        this.findRelevantCommunities(caseParams),
        this.findRelevantOrganizations(caseParams),
      ]);

      yield { step: 'searching', progress: 55, message: 'Search complete. Generating recommendations...' };

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

  // ─────────────────────────────────────────────────────────────────────────
  // Conversation management
  // ─────────────────────────────────────────────────────────────────────────

  async getHistory(userId: string) {
    return this.prisma.clinicalConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
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

    const lastAssistantMsg = conversation.messages.find(m => m.role === 'assistant');
    const previousInsights = lastAssistantMsg?.metadata as any;
    const previousCaseParams = previousInsights?.caseAnalysis as CaseParameters | undefined;

    const enrichedQuery = previousCaseParams
      ? `Previous context - Diagnosis: ${previousCaseParams.diagnosis.join(', ')}. Challenges: ${previousCaseParams.challenges.join(', ')}. Follow-up question: ${query}`
      : query;

    const [caseParams, queryEmbedding] = await Promise.all([
      this.extractCaseParameters(enrichedQuery),
      this.aiService.generateEmbedding(enrichedQuery).catch(() => [] as number[]),
    ]);

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

  // ─────────────────────────────────────────────────────────────────────────
  // Delete conversation
  // ─────────────────────────────────────────────────────────────────────────

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new Error('Not authorized to delete this conversation');
    }

    await this.prisma.clinicalConversation.delete({
      where: { id: conversationId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Share insight with therapist
  // ─────────────────────────────────────────────────────────────────────────

  async shareInsight(
    conversationId: string,
    userId: string,
    therapistId: string,
    message?: string,
  ) {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new Error('Conversation not found');
    if (conversation.userId !== userId) throw new Error('Not authorized to share this conversation');

    // Find therapist user by therapist profile ID or user ID
    const therapist = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: therapistId },
          { therapistProfile: { id: therapistId } },
        ],
        role: { in: ['THERAPIST', 'EDUCATOR'] },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!therapist) throw new Error('Therapist not found');

    // Upsert: reactivate if previously revoked, or create new
    const share = await this.prisma.insightShare.upsert({
      where: {
        conversationId_sharedWith: {
          conversationId,
          sharedWith: therapist.id,
        },
      },
      update: { isActive: true, message, sharedAt: new Date() },
      create: {
        conversationId,
        sharedBy: userId,
        sharedWith: therapist.id,
        message,
      },
    });

    return {
      ...share,
      therapist: {
        id: therapist.id,
        name: therapist.name,
        email: therapist.email,
        image: therapist.image,
      },
    };
  }

  async getInsightShares(conversationId: string, userId: string) {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found or access denied');
    }

    return this.prisma.insightShare.findMany({
      where: { conversationId, isActive: true },
      include: {
        therapist: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { sharedAt: 'desc' },
    });
  }

  async revokeInsightShare(
    conversationId: string,
    userId: string,
    therapistId: string,
  ): Promise<void> {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found or access denied');
    }

    await this.prisma.insightShare.updateMany({
      where: { conversationId, sharedWith: therapistId, isActive: true },
      data: { isActive: false },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get follow-up Q&A pairs
  // ─────────────────────────────────────────────────────────────────────────

  async getFollowUps(conversationId: string, userId: string) {
    const conversation = await this.prisma.clinicalConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found or access denied');
    }

    // Skip the first 2 messages (initial user query + assistant response)
    // and pair up subsequent user/assistant messages as follow-ups
    const messages = conversation.messages.slice(2);
    const followUps: { id: string; question: string; answer: string; createdAt: string }[] = [];

    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];
      if (userMsg?.role === 'user') {
        followUps.push({
          id: userMsg.id,
          question: userMsg.content,
          answer: assistantMsg?.content || 'Processing...',
          createdAt: userMsg.createdAt.toISOString(),
        });
      }
    }

    return followUps;
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
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const planContent = JSON.parse(jsonStr);

      const plan = await this.prisma.clinicalPlan.create({
        data: {
          userId,
          title: planContent.title || 'Structured Plan',
          content: planContent,
        },
      });

      return { ...planContent, id: plan.id };
    } catch (error) {
      this.logger.error('Error creating structured plan:', error);
      throw new Error('Failed to generate plan');
    }
  }

  async getPlan(id: string) {
    return this.prisma.clinicalPlan.findUnique({ where: { id } });
  }

  async findRelevantPosts(conversationId: string, userId: string): Promise<RelevantPost[]> {
    try {
      const conversation = await this.prisma.clinicalConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            where: { role: 'assistant' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!conversation || conversation.userId !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      const lastAssistantMsg = conversation.messages[0];
      const metadata = lastAssistantMsg?.metadata as any;
      const caseAnalysis = metadata?.caseAnalysis as CaseParameters | undefined;

      if (!caseAnalysis) {
        return [];
      }

      const terms = [
        ...(caseAnalysis.diagnosis || []),
        ...(caseAnalysis.challenges || []),
        ...(caseAnalysis.goals || []),
      ].filter(Boolean);

      if (terms.length === 0) return [];

      // Strategy 1: Combined keyword text search (like SafeHaven)
      const combined = terms.slice(0, 2).join(' ');
      let posts = await this.searchPostsByText(combined, 5);

      // Strategy 2: Individual term search if combined returns nothing
      if (posts.length === 0) {
        const seenIds = new Set<string>();
        for (const term of terms.slice(0, 3)) {
          const termPosts = await this.searchPostsByText(term, 3);
          for (const post of termPosts) {
            if (!seenIds.has(post.id)) {
              seenIds.add(post.id);
              posts.push(post);
            }
          }
          if (posts.length >= 5) break;
        }
        posts = posts.slice(0, 5);
      }

      // Strategy 3: Vector search as enhancement (if text search found nothing)
      if (posts.length === 0) {
        try {
          const searchText = terms.join(' ');
          const embedding = await this.aiService.generateEmbedding(searchText).catch(() => [] as number[]);
          if (embedding && embedding.length > 0) {
            const vectorPosts = await this.prisma.$queryRaw<any[]>`
              SELECT
                p.id, p.title, p.content, p.tags, p.upvotes, p."viewCount", p."createdAt",
                u.name as "authorName", u.role as "authorRole", u.image as "authorAvatar",
                c.name as "communityName", c.slug as "communitySlug",
                (SELECT COUNT(*)::int FROM "Comment" cm WHERE cm."postId" = p.id) as "commentCount"
              FROM "Post" p
              JOIN "User" u ON p."authorId" = u.id
              LEFT JOIN "Community" c ON p."communityId" = c.id
              WHERE p."moderationStatus" = 'APPROVED'
                AND p.embedding IS NOT NULL
                AND p."isPublished" = true
              ORDER BY p.embedding::vector <=> ${embedding}::vector
              LIMIT 5
            `;
            posts = this.mapRawPostsToRelevantPosts(vectorPosts);
          }
        } catch (err) {
          this.logger.warn('Vector search fallback failed:', err);
        }
      }

      return posts;
    } catch (error) {
      this.logger.error('Error finding relevant posts:', error);
      return [];
    }
  }

  private async searchPostsByText(search: string, limit: number): Promise<RelevantPost[]> {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          isPublished: true,
          moderationStatus: 'APPROVED',
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { tags: { hasSome: search.toLowerCase().split(' ').filter(Boolean) } },
          ],
        },
        include: {
          author: {
            select: { name: true, role: true, image: true },
          },
          community: {
            select: { name: true, slug: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return posts.map(post => ({
        id: post.id,
        title: post.title || 'Untitled Post',
        content: (post.content || '').substring(0, 300),
        authorName: post.author?.name || 'Community Member',
        authorRole: this.formatRole(post.author?.role || 'USER'),
        authorAvatar: post.author?.image || undefined,
        tags: post.tags || [],
        upvotes: post.upvotes || 0,
        viewCount: post.viewCount || 0,
        commentCount: post._count?.comments || 0,
        createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
        communityName: post.community?.name || undefined,
        communitySlug: post.community?.slug || undefined,
      }));
    } catch (error) {
      this.logger.error('Text search for posts failed:', error);
      return [];
    }
  }

  private mapRawPostsToRelevantPosts(rawPosts: any[]): RelevantPost[] {
    return (rawPosts || []).map(post => ({
      id: post.id,
      title: post.title || 'Untitled Post',
      content: (post.content || '').substring(0, 300),
      authorName: post.authorName || 'Community Member',
      authorRole: this.formatRole(post.authorRole || 'USER'),
      authorAvatar: post.authorAvatar || undefined,
      tags: post.tags || [],
      upvotes: post.upvotes || 0,
      viewCount: post.viewCount || 0,
      commentCount: post.commentCount || 0,
      createdAt: post.createdAt?.toISOString?.() || new Date().toISOString(),
      communityName: post.communityName || undefined,
      communitySlug: post.communitySlug || undefined,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: conversation persistence
  // ─────────────────────────────────────────────────────────────────────────

  private async saveConversation(userId: string, query: string, insights: ClinicalInsight | EnrichedClinicalInsight) {
    const enriched = insights as EnrichedClinicalInsight;
    const title = enriched.child?.name
      ? `${enriched.child.name} — Developmental Analysis`
      : insights.caseAnalysis.diagnosis[0]
        ? `Case: ${insights.caseAnalysis.diagnosis.join(', ')}`
        : `Clinical Analysis ${new Date().toLocaleDateString()}`;

    return this.prisma.clinicalConversation.create({
      data: {
        userId,
        title,
        messages: {
          create: [
            { role: 'user', content: query },
            { role: 'assistant', content: 'Here is the clinical analysis based on your case.', metadata: insights as any },
          ],
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: AI extraction
  // ─────────────────────────────────────────────────────────────────────────

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
      return { diagnosis: [], interventions: [], challenges: [], goals: [] };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: similar cases (pgvector)
  // ─────────────────────────────────────────────────────────────────────────

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
        return [];
      }

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
        this.logger.error('Vector search failed:', error);
        return [];
      });

      if (!similarPosts || similarPosts.length === 0) return [];

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
        })),
      );
    } catch (error) {
      this.logger.error('Error finding similar cases:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: PubMed search
  // ─────────────────────────────────────────────────────────────────────────

  private async searchPubMed(caseParams: CaseParameters): Promise<PubMedArticle[]> {
    try {
      const searchTerms = await this.generatePubMedQuery(caseParams);
      this.logger.debug(`PubMed search query: ${searchTerms}`);

      const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
      const searchResponse = await axios.get(searchUrl, {
        params: { db: 'pubmed', term: searchTerms, retmax: 10, retmode: 'json', sort: 'relevance' },
        timeout: 10000,
      });

      const pmids = searchResponse.data?.esearchresult?.idlist || [];

      if (pmids.length === 0) {
        this.logger.debug('No PubMed results for complex query, trying simple diagnosis query');
        const simpleQuery = caseParams.diagnosis.join(' OR ');
        if (!simpleQuery.trim()) return [];
        const simpleResponse = await axios.get(searchUrl, {
          params: { db: 'pubmed', term: simpleQuery, retmax: 5, retmode: 'json', sort: 'relevance' },
          timeout: 10000,
        });
        const simplePmids = simpleResponse.data?.esearchresult?.idlist || [];
        if (simplePmids.length === 0) {
          // Final fallback: try each diagnosis term individually
          for (const term of caseParams.diagnosis.slice(0, 3)) {
            try {
              const fallbackRes = await axios.get(searchUrl, {
                params: { db: 'pubmed', term: `${term} therapy intervention`, retmax: 3, retmode: 'json', sort: 'relevance' },
                timeout: 10000,
              });
              const fallbackPmids = fallbackRes.data?.esearchresult?.idlist || [];
              if (fallbackPmids.length > 0) {
                this.logger.debug(`Fallback PubMed search found ${fallbackPmids.length} results for "${term}"`);
                return this.fetchPubMedDetails(fallbackPmids, caseParams);
              }
            } catch { /* continue to next term */ }
          }
          return [];
        }
        return this.fetchPubMedDetails(simplePmids, caseParams);
      }

      return this.fetchPubMedDetails(pmids, caseParams);
    } catch (error) {
      this.logger.error('PubMed search failed:', error);
      return [];
    }
  }

  private async generatePubMedQuery(caseParams: CaseParameters): Promise<string> {
    const prompt = `Generate a PubMed search query for a patient with:
      Diagnosis: ${caseParams.diagnosis.join(', ')}
      Interventions: ${caseParams.interventions.join(', ')}
      Challenges: ${caseParams.challenges.join(', ')}

      Return ONLY the search string. Use MeSH terms where possible. Use AND/OR operators.
      Focus on PRACTICAL CLINICAL INTERVENTIONS, MANAGEMENT STRATEGIES, and THERAPIES.
      Avoid purely genetic or molecular research unless directly relevant to treatment.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });
      return response.choices[0]?.message?.content?.trim() || caseParams.diagnosis.join(' AND ');
    } catch {
      return caseParams.diagnosis.join(' AND ');
    }
  }

  private async fetchPubMedDetails(pmids: string[], caseParams: CaseParameters): Promise<PubMedArticle[]> {
    const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
    const fetchResponse = await axios.get(fetchUrl, {
      params: { db: 'pubmed', id: pmids.join(','), rettype: 'abstract', retmode: 'xml' },
      timeout: 10000,
    });

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(fetchResponse.data);
    const articles = this.parsePubMedResults(result);
    return this.rankArticles(articles, caseParams);
  }

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

  private extractAbstract(abstractData: any): string {
    if (!abstractData?.[0]) return 'No abstract available';
    const abstractTexts = abstractData[0].AbstractText;
    if (!abstractTexts) return 'No abstract available';
    return abstractTexts.map((text: any) => {
      if (typeof text === 'string') return text;
      return text._ || '';
    }).join(' ').substring(0, 500) + '...';
  }

  private extractAuthors(authorList: any): string[] {
    if (!authorList?.[0]?.Author) return [];
    return authorList[0].Author.slice(0, 3).map((author: any) => {
      const lastName = author.LastName?.[0] || '';
      const initials = author.Initials?.[0] || '';
      return `${lastName} ${initials}`.trim();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: recommendations
  // ─────────────────────────────────────────────────────────────────────────

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
        "Detailed step 1 (2-3 sentences)",
        "Detailed step 2 (2-3 sentences)",
        "Detailed step 3 (2-3 sentences)"
      ],
      "priority": "high|medium|low",
      "timeline": "Expected timeline for results",
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
      "availability": { "india": true, "telehealth": false, "languages": ["English"] },
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
      return { recommendations: parsed.recommendations || [], alternatives: parsed.alternatives || [] };
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  private getFallbackRecommendations() {
    return {
      recommendations: [
        {
          title: 'Comprehensive Multidisciplinary Assessment',
          description: 'Schedule a complete evaluation with a developmental pediatrician, speech therapist, and occupational therapist. This assessment identifies specific areas of need and creates a baseline for measuring progress.',
          actionSteps: [
            'Contact a developmental pediatrician for initial consultation',
            'Request referrals to speech-language pathologist and occupational therapist',
            'Gather all previous medical records and intervention reports',
          ],
          priority: 'high' as const,
          timeline: '2-4 weeks',
          availability: { india: true, telehealth: true, languages: ['English', 'Hindi'] },
          costEstimate: 'INR 5,000-15,000',
        },
        {
          title: 'Evidence-Based Behavioral Intervention Program',
          description: 'Implement a structured behavioral intervention program tailored to the child\'s needs using Applied Behavior Analysis principles combined with naturalistic teaching strategies.',
          actionSteps: [
            'Find a certified ABA therapist or behavioral consultant',
            'Start with 10-15 hours per week of therapy',
            'Include parent training sessions for consistency at home',
          ],
          priority: 'high' as const,
          timeline: '8-12 weeks for initial improvements',
          availability: { india: true, telehealth: true, languages: ['English', 'Hindi', 'Tamil'] },
          costEstimate: 'INR 800-2,000 per session',
        },
      ],
      alternatives: [
        {
          title: 'Parent-Mediated Early Intervention',
          description: 'Training parents to deliver therapeutic interventions during daily routines. Research shows this can be highly effective and more affordable.',
          actionSteps: ['Enroll in parent training workshop', 'Practice strategies during daily activities'],
          priority: 'medium' as const,
          timeline: '3-6 months',
          availability: { india: true, telehealth: true, languages: ['English', 'Hindi'] },
          costEstimate: 'INR 2,000-10,000 for workshop series',
        },
      ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: experts, communities, organizations
  // ─────────────────────────────────────────────────────────────────────────

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

      const experts = await this.prisma.user.findMany({
        where: {
          role: { in: ['THERAPIST', 'EDUCATOR'] },
          verificationStatus: 'VERIFIED',
          specialization: { isEmpty: false },
        },
        select: {
          id: true, name: true, role: true, specialization: true,
          yearsOfExperience: true, reputation: true, trustScore: true, organization: true,
          _count: { select: { posts: true, comments: true } },
        },
        take: 20,
      });

      let scored = experts.map(expert => {
        const specs = (expert.specialization || []).map(s => s.toLowerCase());
        const overlapCount = keywords.filter(k => specs.some(s => s.includes(k) || k.includes(s))).length;
        const relevanceScore = overlapCount / Math.max(keywords.length, 1);
        return { ...expert, relevanceScore };
      });

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
          this.logger.warn('Vector expert matching failed:', err);
        }
      }

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

  private async findRelevantCommunities(caseParams: CaseParameters): Promise<RelevantCommunity[]> {
    try {
      const keywords = [...(caseParams.diagnosis || []), ...(caseParams.challenges || [])].map(k => k.toLowerCase());

      if (keywords.length === 0) {
        const general = await this.prisma.community.findMany({
          where: { tags: { hasSome: ['support', 'general', 'parenting'] } },
          take: 3,
          orderBy: { memberCount: 'desc' },
        });
        return general.map(c => ({
          id: c.id, name: c.name, slug: c.slug,
          description: c.description || '', memberCount: c.memberCount,
          matchReason: 'General Support Community', tags: c.tags,
        }));
      }

      const communities = await this.prisma.community.findMany({
        where: {
          OR: [
            { tags: { hasSome: keywords } },
            { OR: keywords.map(k => ({ description: { contains: k, mode: 'insensitive' } })) },
            { OR: keywords.map(k => ({ name: { contains: k, mode: 'insensitive' } })) },
          ],
        },
        take: 5,
        orderBy: { memberCount: 'desc' },
      });

      if (communities.length === 0) {
        const popular = await this.prisma.community.findMany({ take: 3, orderBy: { memberCount: 'desc' } });
        return popular.map(c => ({
          id: c.id, name: c.name, slug: c.slug,
          description: c.description || '', memberCount: c.memberCount,
          matchReason: 'Popular Community', tags: c.tags,
        }));
      }

      return communities.map(c => {
        const matchedTags = c.tags.filter(t => keywords.some(k => k.includes(t.toLowerCase()) || t.toLowerCase().includes(k)));
        return {
          id: c.id, name: c.name, slug: c.slug,
          description: c.description || '', memberCount: c.memberCount,
          matchReason: matchedTags.length > 0 ? `Matches ${matchedTags[0]} interest` : 'Relevant topic',
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

      const orgs = await this.prisma.organization.findMany({
        where: {
          communities: {
            some: {
              OR: [
                ...(keywords.length > 0 ? [{ tags: { hasSome: keywords } }] : []),
                ...keywords.map(k => ({ name: { contains: k, mode: 'insensitive' as const } })),
                ...keywords.map(k => ({ description: { contains: k, mode: 'insensitive' as const } })),
              ],
            },
          },
        },
        select: {
          id: true, name: true, slug: true, description: true, logo: true, website: true,
          _count: { select: { communities: true, members: true } },
        },
        take: 5,
      });

      if (orgs.length === 0) {
        return this.prisma.organization.findMany({
          orderBy: { communities: { _count: 'desc' } },
          select: {
            id: true, name: true, slug: true, description: true, logo: true, website: true,
            _count: { select: { communities: true, members: true } },
          },
          take: 3,
        });
      }

      return orgs;
    } catch (error) {
      this.logger.error('Error finding organizations:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: helpers
  // ─────────────────────────────────────────────────────────────────────────

  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      THERAPIST: 'Licensed Therapist',
      EDUCATOR: 'Special Educator',
      USER: 'Community Member',
      ORGANIZATION: 'Healthcare Organization',
    };
    return roleMap[role] || role;
  }

  private explainRelevance(post: any, caseParams: CaseParameters): string {
    if (caseParams.diagnosis.some(d => post.content.toLowerCase().includes(d.toLowerCase()))) {
      return 'Similar diagnosis and treatment context';
    }
    if (caseParams.challenges.some(c => post.content.toLowerCase().includes(c.toLowerCase()))) {
      return 'Addresses similar challenges';
    }
    return 'Related therapeutic approach';
  }

  private calculateConfidence(similarCases: any[], articles: any[]): number {
    const caseScore = Math.min(similarCases.length * 0.15, 0.45);
    const articleScore = Math.min(articles.length * 0.1, 0.5);
    return Math.min(0.95, 0.5 + caseScore + articleScore);
  }

  private compileCitations(articles: PubMedArticle[]): string[] {
    return articles.map(article =>
      `${article.authors.join(', ')} (${article.year}). ${article.title}. ${article.journal}.`,
    );
  }

  private rankArticles(articles: PubMedArticle[], caseParams: CaseParameters): PubMedArticle[] {
    return articles.map(article => {
      let score = 0;
      const text = `${article.title} ${article.abstract}`.toLowerCase();
      caseParams.diagnosis.forEach(d => { if (text.includes(d.toLowerCase())) score += 0.3; });
      caseParams.interventions.forEach(i => { if (text.includes(i.toLowerCase())) score += 0.2; });
      const year = parseInt(article.year);
      if (year >= 2023) score += 0.2;
      else if (year >= 2020) score += 0.1;
      return { ...article, relevanceScore: Math.min(score, 1) };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
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

  async simplifyContent(content: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Simplify this medical text for parents. Use simple words, short sentences, and avoid jargon.' },
        { role: 'user', content },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content || content;
  }
}
