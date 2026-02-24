import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import OpenAI from 'openai';
import type { MiraResponse, MiraCard, MiraAction, ConversationSummary, ScribeResponse } from './mira.types';

const MIRA_SYSTEM_PROMPT = `You are Mira — not a chatbot, not a search engine, but a caring companion who truly understands what it feels like to worry about your child. You live on the Upllyft platform, and parents come to you during some of their most vulnerable moments. Treat every message like it matters deeply, because it does.

Who you are:
- You're the kind of person a parent would want to sit with over chai and open up to — warm, patient, genuinely present
- You've seen hundreds of families navigate these exact worries, and you carry that wisdom gently
- You FEEL what parents feel. When they're scared, you don't rush to reassure — you sit with them in that fear first. When they're proud, you light up with them
- You never, ever diagnose. Instead of "your child has X," you say things like "what you're describing sounds like it could be worth exploring with someone who can look more closely"
- You always use the child's name when you know it — because this isn't about "a child," it's about THEIR child
- You speak like a real person. Contractions, warmth, the occasional "I hear you" or "that makes so much sense." No clinical stiffness
- You understand Indian family realities — the pressure from in-laws who say "he'll grow out of it," the school that's already labeling, the guilt a mother carries when she wonders if she did something wrong. You get it

How you show up:
- ALWAYS lead with the heart before the head. Validate how the parent is feeling before offering any information
- Notice the emotion behind the words. If a parent says "my child still can't speak properly," hear the worry, the late nights, the comparisons at playgrounds. Respond to THAT first
- Share information like you're sitting next to them, not lecturing from a podium. "You know, a lot of families I've seen..." not "Research indicates that..."
- Celebrate every small win like it matters — because it does. A child who made eye contact today, who tried a new food, who sat through circle time for the first time
- Be honest when something needs attention, but wrap that honesty in care: "I want to be real with you because I care about [child's name]..."
- Don't overwhelm. One or two key things per response. Let the conversation breathe
- If something is urgent or safety-related, be direct but still compassionate — help them feel held even in a crisis

Response format:
Always respond with a JSON object containing:
- text: your conversational response (warm, human, 2-4 paragraphs max — write like you're talking to a friend, not a patient)
- cards: array of inline cards to show (therapists, communities, papers, etc) — only include when genuinely relevant, never force them
- choices: 2-4 suggested follow-up questions as short strings the parent can tap (make these feel natural, like things a friend would ask next)
- actions: specific platform actions the parent can take (array of { label, url, type })
- sentiment: one of "supportive", "informational", "encouraging", "concerned"

Critical rules:
- Return ONLY valid JSON, no markdown wrapping
- If the parent has screening data, weave it naturally into conversation — don't just list scores
- The first response should make the parent feel SEEN before anything else happens`;

const MIRA_STREAM_SYSTEM_PROMPT = `You are Mira — not a chatbot, not a search engine, but a caring companion who truly understands what it feels like to worry about your child. You live on the Upllyft platform, and parents come to you during some of their most vulnerable moments. Treat every message like it matters deeply, because it does.

Who you are:
- You're the kind of person a parent would want to sit with over chai and open up to — warm, patient, genuinely present
- You've seen hundreds of families navigate these exact worries, and you carry that wisdom gently
- You FEEL what parents feel. When they're scared, you don't rush to reassure — you sit with them in that fear first. When they're proud, you light up with them
- You never, ever diagnose. Instead of "your child has X," you say things like "what you're describing sounds like it could be worth exploring with someone who can look more closely"
- You always use the child's name when you know it — because this isn't about "a child," it's about THEIR child
- You speak like a real person. Contractions, warmth, the occasional "I hear you" or "that makes so much sense." No clinical stiffness
- You understand Indian family realities — the pressure from in-laws who say "he'll grow out of it," the school that's already labeling, the guilt a mother carries when she wonders if she did something wrong. You get it

How you show up:
- ALWAYS lead with the heart before the head. Validate how the parent is feeling before offering any information
- Notice the emotion behind the words. If a parent says "my child still can't speak properly," hear the worry, the late nights, the comparisons at playgrounds. Respond to THAT first
- Share information like you're sitting next to them, not lecturing from a podium. "You know, a lot of families I've seen..." not "Research indicates that..."
- Celebrate every small win like it matters — because it does
- Be honest when something needs attention, but wrap that honesty in care: "I want to be real with you because I care about [child's name]..."
- Don't overwhelm. One or two key things per response. Let the conversation breathe
- If something is urgent or safety-related, be direct but still compassionate

Critical rules:
- Keep responses warm and human, 2-4 paragraphs max
- Write in plain text only. No JSON, no markdown headers, no bullet points with dashes. Just natural conversational paragraphs — like you're texting a friend you care about
- If the parent has screening data, weave it naturally into conversation — don't list scores clinically
- The first response should make the parent feel SEEN and HEARD before anything else happens
- Use the child's name. Say "I hear you." Acknowledge that this is hard. Be human.`;

const MIRA_STRUCTURED_EXTRACT_PROMPT = `Given Mira's response text and the available platform context, extract structured data. Return ONLY valid JSON with:
{
  "cards": [{"type": "therapist|community|organisation|evidence|conversation|screening_prompt", "data": {"name": "..."}}],
  "choices": ["suggested follow-up question 1", "suggested follow-up question 2", "suggested follow-up question 3"],
  "actions": [{"label": "action text", "url": "", "type": "booking|community|screening|resource|insight"}],
  "sentiment": "supportive|informational|encouraging|concerned"
}
Rules:
- cards: only include if Mira mentioned a specific therapist, community, organization, post, or screening in her response. Use the type field to indicate what kind of card. Don't force cards.
- choices: 2-4 warm, natural follow-up questions the parent might want to ask next. Write them in first person as if the parent is speaking, like "How can I help at home?", "What does that mean for my child?", "Can you tell me more about that?". They should feel human and caring, not clinical.
- actions: only if Mira suggested a specific action (booking, screening, visiting community, etc.). Use warm labels like "Find the right therapist" not "Book therapist"
- sentiment: classify the overall emotional tone of Mira's response`;

@Injectable()
export class MiraService {
  private readonly logger = new Logger(MiraService.name);
  private openai: OpenAI;

  private readonly appUrls: {
    main: string;
    screening: string;
    booking: string;
    community: string;
    resources: string;
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private aiService: AiService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    const isProd = this.configService.get('NODE_ENV') === 'production';
    this.appUrls = {
      main: isProd ? 'https://app.safehaven-upllyft.com' : 'http://localhost:3000',
      screening: isProd ? 'https://screening.safehaven-upllyft.com' : 'http://localhost:3003',
      booking: isProd ? 'https://booking.safehaven-upllyft.com' : 'http://localhost:3004',
      community: isProd ? 'https://community.safehaven-upllyft.com' : 'http://localhost:3002',
      resources: isProd ? 'https://resources.safehaven-upllyft.com' : 'http://localhost:3005',
    };
  }

  // ── Chat ────────────────────────────────────────────────────────────────

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
    childId?: string,
  ): Promise<{ conversationId: string; response: MiraResponse }> {
    // 1. Load or create conversation
    let conversation: any;
    let history: { role: string; content: string }[] = [];

    if (conversationId) {
      conversation = await this.prisma.miraConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
      if (conversation.userId !== userId) throw new ForbiddenException('Not your conversation');

      // Use childId from existing conversation if not provided
      childId = childId || conversation.childId || undefined;

      // Build history from previous messages
      history = conversation.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'assistant'
          ? m.content // text-only for history context
          : m.content,
      }));
    } else {
      conversation = await this.prisma.miraConversation.create({
        data: {
          userId,
          childId: childId || null,
          title: message.substring(0, 100),
        },
      });
    }

    // 2. Gather context
    const context = await this.gatherContext(userId, childId, message);

    // 3. Build system message with context
    const systemMessage = this.buildSystemMessage(context);

    // 4. Call AI
    const miraResponse = await this.callAI(systemMessage, history, message, context);

    // 5. Save messages
    await this.prisma.miraMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'user',
          content: message,
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: miraResponse.text,
          cards: miraResponse.cards && miraResponse.cards.length > 0
            ? miraResponse.cards as any
            : undefined,
          choices: miraResponse.choices && miraResponse.choices.length > 0
            ? miraResponse.choices
            : undefined,
          actions: miraResponse.actions && miraResponse.actions.length > 0
            ? miraResponse.actions as any
            : undefined,
          sentiment: miraResponse.sentiment || null,
        },
      ],
    });

    // 6. Update conversation title if first message
    if (!conversationId) {
      // Generate a short title from the first message
      const title = await this.generateTitle(message).catch(() => message.substring(0, 80));
      await this.prisma.miraConversation.update({
        where: { id: conversation.id },
        data: { title },
      });
    } else {
      await this.prisma.miraConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    return { conversationId: conversation.id, response: miraResponse };
  }

  // ── Streaming Chat ──────────────────────────────────────────────────────

  async *chatStream(
    userId: string,
    message: string,
    conversationId?: string,
    childId?: string,
  ): AsyncGenerator<{ type: string; data: any }> {
    // 1. Load or create conversation
    let conversation: any;
    let history: { role: string; content: string }[] = [];

    if (conversationId) {
      conversation = await this.prisma.miraConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
      if (conversation.userId !== userId) throw new ForbiddenException('Not your conversation');
      childId = childId || conversation.childId || undefined;
      history = conversation.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    } else {
      conversation = await this.prisma.miraConversation.create({
        data: { userId, childId: childId || null, title: message.substring(0, 100) },
      });
    }

    // Emit conversationId immediately
    yield { type: 'conversation', data: { conversationId: conversation.id } };

    // 2. Gather context
    const context = await this.gatherContext(userId, childId, message);

    // 3. Build system message for streaming (plain text output)
    const systemMessage = this.buildSystemMessage(context, true);

    // 4. Stream AI response tokens
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    let fullText = '';

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          yield { type: 'token', data: { text: delta } };
        }
      }
    } catch (error) {
      this.logger.error('Mira stream failed:', error);
      fullText = "I'm sorry, I'm having a little trouble right now. Could you try again in a moment?";
      yield { type: 'token', data: { text: fullText } };
    }

    // 5. Extract structured data (cards, choices, actions) via fast model
    const structured = await this.extractStructuredData(fullText, context);
    yield { type: 'structured', data: structured };

    // 6. Save messages to DB
    await this.prisma.miraMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: message },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: fullText,
          cards: structured.cards?.length ? structured.cards as any : undefined,
          choices: structured.choices?.length ? structured.choices : undefined,
          actions: structured.actions?.length ? structured.actions as any : undefined,
          sentiment: structured.sentiment || null,
        },
      ],
    });

    // 7. Update title
    if (!conversationId) {
      const title = await this.generateTitle(message).catch(() => message.substring(0, 80));
      await this.prisma.miraConversation.update({
        where: { id: conversation.id },
        data: { title },
      });
    } else {
      await this.prisma.miraConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    yield { type: 'done', data: {} };
  }

  // ── Scribe Mode ────────────────────────────────────────────────────────

  async scribe(sessionId: string, therapistUserId: string): Promise<ScribeResponse> {
    // 1. Fetch the session
    const session = await this.prisma.caseSession.findUnique({
      where: { id: sessionId },
      include: {
        therapist: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== therapistUserId) {
      // Check if user is ADMIN — handled at controller level via RolesGuard
      // but also verify therapist ownership here
      const user = await this.prisma.user.findUnique({ where: { id: therapistUserId }, select: { role: true } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException('You can only generate drafts for your own sessions');
      }
    }
    if (session.noteStatus === 'SIGNED') {
      throw new BadRequestException('Cannot generate a draft for a signed session');
    }

    // 2. Fetch the case with child and IEP goals
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: session.caseId },
      include: {
        child: {
          include: { conditions: true },
        },
        ieps: {
          where: { status: { in: ['ACTIVE', 'DRAFT'] } },
          include: {
            goals: {
              where: { status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
              select: { goalText: true, domain: true, currentProgress: true },
            },
          },
          take: 2,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    const child = caseRecord.child;

    // 3. Gather child concerns from profile
    const concerns: string[] = [];
    if (child.developmentalConcerns) concerns.push(child.developmentalConcerns);
    if (child.learningDifficulties) concerns.push(child.learningDifficulties);
    if (child.teacherConcerns) concerns.push(child.teacherConcerns);
    const childConditions = (child.conditions || []).map(
      (c) => `${c.conditionType}${c.specificDiagnosis ? ` (${c.specificDiagnosis})` : ''}`,
    );
    if (childConditions.length > 0) concerns.push(...childConditions);

    // 4. Gather active IEP goals
    const activeGoals = caseRecord.ieps
      .flatMap((iep) => iep.goals)
      .map((g) => `[${g.domain}] ${g.goalText} (progress: ${g.currentProgress}%)`);

    // 5. Fetch last 3 signed sessions for continuity
    const recentSessions = await this.prisma.caseSession.findMany({
      where: {
        caseId: session.caseId,
        noteStatus: 'SIGNED',
        id: { not: sessionId },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 3,
      select: {
        scheduledAt: true,
        structuredNotes: true,
      },
    });

    const last3Assessments = recentSessions
      .map((s) => {
        const notes = s.structuredNotes as Record<string, string> | null;
        if (!notes) return null;
        return `Session ${s.scheduledAt.toISOString().split('T')[0]}: Assessment: ${notes.assessment || 'N/A'} | Plan: ${notes.plan || 'N/A'}`;
      })
      .filter(Boolean)
      .join('\n');

    // 6. Build existing SOAP content
    const existingSoap = session.structuredNotes as Record<string, string> | null;
    const existingContent = existingSoap
      ? `Subjective: ${existingSoap.subjective || ''}\nObjective: ${existingSoap.objective || ''}\nAssessment: ${existingSoap.assessment || ''}\nPlan: ${existingSoap.plan || ''}`
      : 'None';

    // 7. Calculate child age
    const dob = new Date(child.dateOfBirth);
    const now = new Date();
    let ageYears = now.getFullYear() - dob.getFullYear();
    let ageMonths = now.getMonth() - dob.getMonth();
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
    const ageStr = ageMonths > 0 ? `${ageYears} years, ${ageMonths} months` : `${ageYears} years`;

    // 8. Build system prompt
    const systemPrompt = `You are a clinical assistant helping a therapist at a neurodivergent support clinic write a session note.
Generate a SOAP note draft based on the context below. Be professional, concise, and clinically appropriate.
Use first-person for the therapist's observations. Do not fabricate clinical observations — write in a style
that invites the therapist to fill in specific details.

Child: the child, ${ageStr}
Concerns: ${concerns.join('; ') || 'None documented'}
Active Goals: ${activeGoals.join('; ') || 'None documented'}
Recent session assessments: ${last3Assessments || 'No prior sessions'}
Today's session: ${session.scheduledAt.toISOString().split('T')[0]}, ${session.actualDuration ?? 60} minutes
Existing note content (if any): ${existingContent}

Return ONLY valid JSON with these four keys:
{
  "soapSubjective": "...",
  "soapObjective": "...",
  "soapAssessment": "...",
  "soapPlan": "..."
}`;

    // 9. Call OpenAI
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the SOAP note draft now.' },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      const draft: ScribeResponse = {
        soapSubjective: parsed.soapSubjective || '',
        soapObjective: parsed.soapObjective || '',
        soapAssessment: parsed.soapAssessment || '',
        soapPlan: parsed.soapPlan || '',
      };

      // 10. Store the draft in Session.aiDraft
      await this.prisma.caseSession.update({
        where: { id: sessionId },
        data: { aiDraft: draft as any },
      });

      return draft;
    } catch (error) {
      this.logger.error('Mira scribe failed:', error);
      throw new BadRequestException('Failed to generate SOAP draft');
    }
  }

  private async extractStructuredData(
    miraText: string,
    ctx: MiraContext,
  ): Promise<{ cards?: MiraCard[]; choices?: string[]; actions?: MiraAction[]; sentiment?: string }> {
    try {
      const contextSummary: string[] = [];
      if (ctx.therapists?.length) contextSummary.push(`Available therapists: ${ctx.therapists.map((t) => t.name).join(', ')}`);
      if (ctx.communities?.length) contextSummary.push(`Available communities: ${ctx.communities.map((c) => c.name).join(', ')}`);
      if (ctx.organizations?.length) contextSummary.push(`Available organizations: ${ctx.organizations.map((o: any) => o.name).join(', ')}`);
      if (ctx.posts?.length) contextSummary.push(`Relevant posts: ${ctx.posts.map((p) => p.title).join(', ')}`);
      if (ctx.child) contextSummary.push(`Child: ${ctx.child.name}`);
      if (ctx.screening) contextSummary.push(`Has screening data`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: MIRA_STRUCTURED_EXTRACT_PROMPT },
          {
            role: 'user',
            content: `Mira's response:\n"${miraText}"\n\nPlatform context:\n${contextSummary.join('\n') || 'No specific platform data available'}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      const cards = this.buildCards(parsed.cards, ctx);
      const actions = this.buildActions(parsed.actions, ctx);

      return {
        cards: cards.length > 0 ? cards : undefined,
        choices: parsed.choices || ['Can you tell me more about this?', 'What can I do to help at home?', 'Is there someone who can guide us?'],
        actions: actions.length > 0 ? actions : undefined,
        sentiment: parsed.sentiment || 'supportive',
      };
    } catch (error) {
      this.logger.error('Failed to extract structured data:', error);
      return {
        choices: ['Can you tell me more about this?', 'What can I do to help at home?', 'Is there someone who can guide us?'],
        sentiment: 'supportive',
      };
    }
  }

  // ── Conversations CRUD ──────────────────────────────────────────────────

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const conversations = await this.prisma.miraConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      lastMessage: c.messages[0]?.content || '',
      updatedAt: c.updatedAt,
      childId: c.childId,
    }));
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.miraConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        child: {
          select: { id: true, firstName: true, dateOfBirth: true, gender: true },
        },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId) throw new ForbiddenException('Not your conversation');

    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.miraConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId) throw new ForbiddenException('Not your conversation');

    await this.prisma.miraConversation.delete({
      where: { id: conversationId },
    });
  }

  // ── Context gathering ───────────────────────────────────────────────────

  private async gatherContext(
    userId: string,
    childId: string | undefined,
    message: string,
  ): Promise<MiraContext> {
    const ctx: MiraContext = {};

    // Load child profile + screenings if childId provided
    if (childId) {
      const [child, assessments] = await Promise.all([
        this.prisma.child.findUnique({
          where: { id: childId },
          include: { conditions: true },
        }),
        this.prisma.assessment.findMany({
          where: { childId, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
        }),
      ]);

      if (child) {
        const dob = new Date(child.dateOfBirth);
        const now = new Date();
        let ageYears = now.getFullYear() - dob.getFullYear();
        let ageMonths = now.getMonth() - dob.getMonth();
        if (ageMonths < 0) { ageYears--; ageMonths += 12; }

        ctx.child = {
          id: child.id,
          name: 'the child', // PDPL: anonymize child name before sending to OpenAI
          age: ageMonths > 0 ? `${ageYears} years, ${ageMonths} months` : `${ageYears} years`,
          gender: child.gender,
          conditions: (child.conditions || []).map((c) =>
            `${c.conditionType}${c.specificDiagnosis ? ` (${c.specificDiagnosis})` : ''}${c.severity ? `, severity: ${c.severity}` : ''}`,
          ),
          challenges: (child.conditions || []).map((c) => c.primaryChallenges).filter(Boolean) as string[],
          strengths: (child.conditions || []).map((c) => c.strengths).filter(Boolean) as string[],
          developmentalConcerns: child.developmentalConcerns || undefined,
          learningDifficulties: child.learningDifficulties || undefined,
        };

        if (assessments.length > 0) {
          const assessment = assessments[0];
          const domainScores = assessment.domainScores as Record<string, { riskIndex: number; status: string }> | null;
          ctx.screening = {
            date: assessment.completedAt?.toISOString() || assessment.createdAt.toISOString(),
            overallScore: assessment.overallScore,
            flaggedDomains: assessment.flaggedDomains || [],
            domainScores: domainScores
              ? Object.entries(domainScores).map(([domain, val]) => ({
                  domain,
                  score: Math.round((1 - val.riskIndex) * 100),
                  status: val.status,
                }))
              : [],
          };
        }
      }
    }

    // Extract keywords from message for platform data matching
    const keywords = await this.extractKeywords(message);
    if (keywords.length === 0) return ctx;

    // Fetch platform data in parallel
    const [therapists, communities, organizations, posts] = await Promise.all([
      this.findRelevantTherapists(keywords),
      this.findRelevantCommunities(keywords),
      this.findRelevantOrganizations(keywords),
      this.findRelevantPosts(keywords),
    ]);

    if (therapists.length > 0) ctx.therapists = therapists;
    if (communities.length > 0) ctx.communities = communities;
    if (organizations.length > 0) ctx.organizations = organizations;
    if (posts.length > 0) ctx.posts = posts;

    return ctx;
  }

  private async extractKeywords(message: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Extract 3-5 developmental/medical keywords from this parent's message for database search. Return ONLY a JSON array of lowercase strings, no markdown.

Message: "${message}"

Example output: ["speech delay", "autism", "occupational therapy"]`,
        }],
        temperature: 0.2,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // Fallback: simple word extraction
      return message.toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5);
    }
  }

  private async findRelevantTherapists(keywords: string[]) {
    try {
      const therapists = await this.prisma.user.findMany({
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
          location: true,
          languages: true,
          image: true,
          therapistProfile: {
            select: { id: true },
          },
        },
        take: 20,
      });

      // Score by keyword match
      const scored = therapists.map((t) => {
        const specs = (t.specialization || []).map((s) => s.toLowerCase());
        const matchCount = keywords.filter((k) =>
          specs.some((s) => s.includes(k) || k.includes(s)),
        ).length;
        return { ...t, matchScore: matchCount };
      });

      return scored
        .filter((t) => t.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3)
        .map((t) => ({
          id: t.id,
          name: t.name || 'Therapist',
          role: t.role === 'THERAPIST' ? 'Licensed Therapist' : 'Special Educator',
          specialization: t.specialization,
          yearsOfExperience: t.yearsOfExperience,
          location: t.location,
          languages: t.languages,
          avatar: t.image,
          therapistProfileId: t.therapistProfile?.id,
        }));
    } catch (error) {
      this.logger.error('Error finding therapists:', error);
      return [];
    }
  }

  private async findRelevantCommunities(keywords: string[]) {
    try {
      const communities = await this.prisma.community.findMany({
        where: {
          OR: [
            { tags: { hasSome: keywords } },
            ...keywords.map((k) => ({ name: { contains: k, mode: 'insensitive' as const } })),
            ...keywords.map((k) => ({ description: { contains: k, mode: 'insensitive' as const } })),
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          memberCount: true,
          tags: true,
        },
        take: 2,
        orderBy: { memberCount: 'desc' },
      });

      return communities;
    } catch (error) {
      this.logger.error('Error finding communities:', error);
      return [];
    }
  }

  private async findRelevantOrganizations(keywords: string[]) {
    try {
      return this.prisma.organization.findMany({
        where: {
          communities: {
            some: {
              OR: [
                { tags: { hasSome: keywords } },
                ...keywords.map((k) => ({ name: { contains: k, mode: 'insensitive' as const } })),
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
        take: 2,
      });
    } catch (error) {
      this.logger.error('Error finding organizations:', error);
      return [];
    }
  }

  private async findRelevantPosts(keywords: string[]) {
    try {
      const combined = keywords.slice(0, 2).join(' ');
      const posts = await this.prisma.post.findMany({
        where: {
          isPublished: true,
          moderationStatus: 'APPROVED',
          OR: [
            { title: { contains: combined, mode: 'insensitive' } },
            { content: { contains: combined, mode: 'insensitive' } },
            { tags: { hasSome: keywords } },
          ],
        },
        include: {
          author: { select: { name: true, role: true } },
          community: { select: { name: true, slug: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { upvotes: 'desc' },
        take: 3,
      });

      return posts.map((p) => ({
        id: p.id,
        title: p.title || 'Untitled',
        excerpt: (p.content || '').substring(0, 150),
        authorName: p.author?.name || 'Community Member',
        authorRole: p.author?.role || 'USER',
        communityName: p.community?.name,
        communitySlug: p.community?.slug,
        upvotes: p.upvotes,
        commentCount: p._count?.comments || 0,
      }));
    } catch (error) {
      this.logger.error('Error finding posts:', error);
      return [];
    }
  }

  // ── AI call ─────────────────────────────────────────────────────────────

  private buildSystemMessage(ctx: MiraContext, streaming = false): string {
    const parts = [streaming ? MIRA_STREAM_SYSTEM_PROMPT : MIRA_SYSTEM_PROMPT];

    if (ctx.child) {
      parts.push(`\n\n--- CHILD PROFILE ---
Name: ${ctx.child.name}
Age: ${ctx.child.age}
Gender: ${ctx.child.gender}
Conditions: ${ctx.child.conditions?.join('; ') || 'None documented'}
Challenges: ${ctx.child.challenges?.join('; ') || 'None noted'}
Strengths: ${ctx.child.strengths?.join('; ') || 'Not documented'}
${ctx.child.developmentalConcerns ? `Developmental concerns: ${ctx.child.developmentalConcerns}` : ''}
${ctx.child.learningDifficulties ? `Learning difficulties: ${ctx.child.learningDifficulties}` : ''}`);
    }

    if (ctx.screening) {
      parts.push(`\n\n--- SCREENING RESULTS ---
Last screening: ${ctx.screening.date}
Overall score: ${ctx.screening.overallScore != null ? Math.round(ctx.screening.overallScore) + '%' : 'N/A'}
Flagged domains: ${ctx.screening.flaggedDomains.join(', ') || 'None'}
Domain scores:
${ctx.screening.domainScores.map((d) => `- ${d.domain}: ${d.score}% (${d.status})`).join('\n')}`);
    } else if (ctx.child) {
      parts.push(`\n\nNote: This child has NOT completed a developmental screening yet. Consider suggesting the UFMF screening.`);
    }

    if (ctx.therapists && ctx.therapists.length > 0) {
      parts.push(`\n\n--- AVAILABLE THERAPISTS (suggest only if relevant) ---
${ctx.therapists.map((t) => `- ${t.name} (${t.role}): specializes in ${t.specialization?.join(', ')}${t.yearsOfExperience ? `, ${t.yearsOfExperience} years experience` : ''}${t.location ? `, ${t.location}` : ''}`).join('\n')}
Booking URL pattern: ${this.appUrls.booking}/therapists/{therapistProfileId}`);
    }

    if (ctx.communities && ctx.communities.length > 0) {
      parts.push(`\n\n--- RELEVANT COMMUNITIES (suggest only if relevant) ---
${ctx.communities.map((c) => `- ${c.name}: ${c.description || 'Community for support'} (${c.memberCount} members)`).join('\n')}
Community URL pattern: ${this.appUrls.community}/communities/{slug}`);
    }

    if (ctx.organizations && ctx.organizations.length > 0) {
      parts.push(`\n\n--- RELEVANT ORGANIZATIONS ---
${ctx.organizations.map((o: any) => `- ${o.name}: ${o.description || 'Organization'}${o.website ? ` (${o.website})` : ''}`).join('\n')}`);
    }

    if (ctx.posts && ctx.posts.length > 0) {
      parts.push(`\n\n--- COMMUNITY CONVERSATIONS (reference if helpful) ---
${ctx.posts.map((p) => `- "${p.title}" by ${p.authorName} (${p.upvotes} upvotes, ${p.commentCount} comments)${p.communityName ? ` in ${p.communityName}` : ''}`).join('\n')}
Post URL pattern: ${this.appUrls.community}/posts/{id}`);
    }

    parts.push(`\n\n--- PLATFORM URLs ---
Screening: ${this.appUrls.screening}
Booking: ${this.appUrls.booking}
Community: ${this.appUrls.community}
Resources: ${this.appUrls.resources}
Insights: ${this.appUrls.screening}/insights`);

    return parts.join('');
  }

  private async callAI(
    systemMessage: string,
    history: { role: string; content: string }[],
    userMessage: string,
    ctx: MiraContext,
  ): Promise<MiraResponse> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...history.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Build proper cards from context data
      const cards = this.buildCards(parsed.cards, ctx);
      // Build proper actions with real URLs
      const actions = this.buildActions(parsed.actions, ctx);

      return {
        text: parsed.text || "I'm here to help. Could you tell me more about what's on your mind?",
        cards: cards.length > 0 ? cards : undefined,
        choices: parsed.choices || ["Tell me more about this", "What should I do next?", "Can you suggest a professional?"],
        actions: actions.length > 0 ? actions : undefined,
        sentiment: parsed.sentiment || 'supportive',
      };
    } catch (error) {
      this.logger.error('Mira AI call failed:', error);
      return {
        text: "I'm sorry, I'm having a little trouble right now. Could you try again in a moment? I want to make sure I give you the best guidance possible.",
        choices: ["Try again", "What can Mira help with?"],
        sentiment: 'supportive',
      };
    }
  }

  private buildCards(aiCards: any[] | undefined, ctx: MiraContext): MiraCard[] {
    const cards: MiraCard[] = [];
    if (!aiCards || !Array.isArray(aiCards)) return cards;

    for (const card of aiCards) {
      switch (card.type) {
        case 'therapist':
          if (ctx.therapists && ctx.therapists.length > 0) {
            const match = ctx.therapists.find((t) =>
              card.data?.name ? t.name?.toLowerCase().includes(card.data.name.toLowerCase()) : true,
            ) || ctx.therapists[0];
            cards.push({ type: 'therapist', data: match });
          }
          break;
        case 'community':
          if (ctx.communities && ctx.communities.length > 0) {
            const match = ctx.communities.find((c) =>
              card.data?.name ? c.name.toLowerCase().includes(card.data.name.toLowerCase()) : true,
            ) || ctx.communities[0];
            cards.push({ type: 'community', data: match });
          }
          break;
        case 'organisation':
          if (ctx.organizations && ctx.organizations.length > 0) {
            cards.push({ type: 'organisation', data: ctx.organizations[0] });
          }
          break;
        case 'conversation':
          if (ctx.posts && ctx.posts.length > 0) {
            const match = ctx.posts.find((p) =>
              card.data?.title ? p.title.toLowerCase().includes(card.data.title.toLowerCase()) : true,
            ) || ctx.posts[0];
            cards.push({ type: 'conversation', data: match });
          }
          break;
        case 'screening_prompt':
          cards.push({
            type: 'screening_prompt',
            data: {
              title: 'Developmental Screening',
              description: 'A quick screening can help identify areas where your child might benefit from extra support.',
              url: this.appUrls.screening,
            },
          });
          break;
        default:
          // Pass through evidence or other AI-generated cards
          if (card.type && card.data) {
            cards.push(card);
          }
      }
    }

    return cards;
  }

  private buildActions(aiActions: any[] | undefined, ctx: MiraContext): MiraAction[] {
    const actions: MiraAction[] = [];
    if (!aiActions || !Array.isArray(aiActions)) return actions;

    for (const action of aiActions) {
      if (!action.label) continue;

      // Resolve URLs based on action type
      let url = action.url || '';
      const type = action.type || 'resource';

      if (type === 'booking' && ctx.therapists?.[0]?.therapistProfileId) {
        url = url || `${this.appUrls.booking}/therapists/${ctx.therapists[0].therapistProfileId}`;
      } else if (type === 'community' && ctx.communities?.[0]?.slug) {
        url = url || `${this.appUrls.community}/communities/${ctx.communities[0].slug}`;
      } else if (type === 'screening') {
        url = url || this.appUrls.screening;
      } else if (type === 'insight') {
        url = url || `${this.appUrls.screening}/insights`;
      } else if (type === 'resource') {
        url = url || this.appUrls.resources;
      }

      // Only include actions with valid URLs
      if (url) {
        actions.push({ label: action.label, url, type });
      }
    }

    return actions;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async generateTitle(message: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Generate a short title (max 60 chars) for a parent conversation that starts with this message. Return ONLY the title text, no quotes.

Message: "${message.substring(0, 200)}"`,
      }],
      temperature: 0.5,
      max_tokens: 30,
    });

    return (response.choices[0]?.message?.content || message.substring(0, 60)).trim();
  }
}

// ── Internal types ────────────────────────────────────────────────────────

interface MiraContext {
  child?: {
    id: string;
    name: string;
    age: string;
    gender: string;
    conditions: string[];
    challenges: string[];
    strengths: string[];
    developmentalConcerns?: string;
    learningDifficulties?: string;
  };
  screening?: {
    date: string;
    overallScore: number | null;
    flaggedDomains: string[];
    domainScores: { domain: string; score: number; status: string }[];
  };
  therapists?: any[];
  communities?: any[];
  organizations?: any[];
  posts?: any[];
}
