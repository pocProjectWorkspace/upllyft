import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MomentCategory, MiraInsightStatus, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMomentDto,
  ListMomentsQueryDto,
  InterpretMomentDto,
  UpdateInsightStatusDto,
} from './dto/moments.dto';
import { DEVELOPMENTAL_DOMAINS } from '../observations/dto/observations.dto';

interface Actor {
  id: string;
  role: string;
}

/** Parent-facing labels for the 8-domain vocabulary the screening uses. */
export const DOMAIN_LABELS: Record<string, string> = {
  grossMotor: 'Gross Motor',
  fineMotor: 'Fine Motor',
  speechLanguage: 'Speech & Language',
  socialEmotional: 'Social-Emotional',
  cognitiveLearning: 'Cognitive / Learning',
  adaptiveSelfCare: 'Adaptive / Self-Care',
  sensoryProcessing: 'Sensory Processing',
  visionHearing: 'Vision & Hearing',
};

/** Progress statuses, ordered by attention — the parent scans "what needs me" first. */
export type ProgressStatus = 'WATCH' | 'IMPROVING' | 'EMERGING' | 'STEADY' | 'NOTHING_NEW';

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;

/**
 * Everyday Moments — a parent's own capture surface for their own child.
 *
 * ACCESS RULE: every method gates on the guardian relationship (profile owner or a
 * consent-holding `Guardian` row) — the same rule `ObservationsService.listForGuardian`
 * uses. There is no facility/consent gate here by design: a parent needs no one's
 * consent to record their own child, and moments must work for children with no
 * facility affiliation at all.
 *
 * HONESTY OF CONFIDENCE: Mira proposes interpretations and surfaces patterns, but the
 * parent confirms everything before it is saved, and insight copy is always "may /
 * seems / worth watching" — never a conclusion.
 */
@Injectable()
export class MomentsService {
  private readonly logger = new Logger(MomentsService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // ─── capture ────────────────────────────────────────────────────────────────

  async create(actor: Actor, childId: string, dto: CreateMomentDto) {
    await this.assertGuardian(childId, actor.id);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (occurredAt > new Date()) occurredAt.setTime(Date.now());

    const moment = await this.prisma.moment.create({
      data: {
        childId,
        createdById: actor.id,
        text: dto.text.trim(),
        category: dto.category ?? null,
        capturedVia: dto.capturedVia ?? 'TEXT',
        place: dto.place?.trim() || null,
        occurredAt,
        domainTags: dto.domainTags ?? [],
        interpretation: (dto.interpretation as Prisma.InputJsonValue) ?? undefined,
      },
      select: this.publicShape(),
    });

    this.logger.log(`Moment ${moment.id} captured for child ${childId}`);
    return moment;
  }

  async list(actor: Actor, childId: string, query: ListMomentsQueryDto) {
    await this.assertGuardian(childId, actor.id);

    const where: Prisma.MomentWhereInput = {
      childId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.domain ? { domainTags: { has: query.domain } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.moment.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
        select: this.publicShape(),
      }),
      this.prisma.moment.count({ where }),
    ]);

    return { moments: rows, total };
  }

  /** The author may retract their own moment; any guardian of the child may too. */
  async remove(actor: Actor, childId: string, momentId: string) {
    await this.assertGuardian(childId, actor.id);

    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, childId },
      select: { id: true },
    });
    if (!moment) throw new NotFoundException('Moment not found.');

    await this.prisma.moment.delete({ where: { id: momentId } });
    return { deleted: true };
  }

  // ─── interpretation (capture-time) ──────────────────────────────────────────

  /**
   * Mira reads what the parent wrote and PROPOSES a category, domain tags and a warm
   * reflection. Nothing is saved here — the parent confirms (or edits) and then the
   * client calls `create` with the confirmed values. Child name is never sent.
   */
  async interpret(actor: Actor, childId: string, dto: InterpretMomentDto) {
    await this.assertGuardian(childId, actor.id);

    const fallback = {
      category: null as MomentCategory | null,
      domainTags: [] as string[],
      place: null as string | null,
      whatHeard: 'Got it — saved just as you told me.',
      followUp: null as string | null,
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are Mira, a warm, plain-spoken assistant helping a parent of a neurodivergent child log a small everyday observation ("moment"). Read the parent's note and return JSON:
{
  "category": one of "WENT_WELL" | "DIFFICULT" | "CHANGED" | "MILESTONE" | null,
  "domainTags": up to 2 of [${DEVELOPMENTAL_DOMAINS.map((d) => `"${d}"`).join(', ')}] — only if clearly relevant, else [],
  "place": a short guess at where it happened (e.g. "Home", "Supermarket", "Nursery") or null,
  "whatHeard": one or two warm sentences reflecting back what you understood — plain language, no clinical jargon, no diagnosis, no over-confident claims,
  "followUp": one short optional clarifying question that would help spot patterns later, or null
}
Refer to the child only as "your child". These are suggestions the parent will confirm — never state interpretations as fact.`,
          },
          { role: 'user', content: dto.text.trim() },
        ],
      });

      const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}');
      const category = ['WENT_WELL', 'DIFFICULT', 'CHANGED', 'MILESTONE'].includes(raw.category)
        ? (raw.category as MomentCategory)
        : null;
      const domainTags = Array.isArray(raw.domainTags)
        ? raw.domainTags.filter((d: string) => (DEVELOPMENTAL_DOMAINS as readonly string[]).includes(d)).slice(0, 2)
        : [];

      return {
        category,
        domainTags,
        domainLabels: domainTags.map((d: string) => DOMAIN_LABELS[d] ?? d),
        place: typeof raw.place === 'string' ? raw.place.slice(0, 120) : null,
        whatHeard: typeof raw.whatHeard === 'string' ? raw.whatHeard : fallback.whatHeard,
        followUp: typeof raw.followUp === 'string' ? raw.followUp : null,
      };
    } catch (error) {
      // Capture must never be blocked by the AI — fall back to a plain save.
      this.logger.warn(`Moment interpretation failed: ${(error as Error).message}`);
      return { ...fallback, domainLabels: [] };
    }
  }

  // ─── insights (Mira has noticed) ────────────────────────────────────────────

  /**
   * Active insights for a child, generating fresh ones when the picture has moved on.
   *
   * VOLUME GOVERNOR: at most 3 non-dismissed insights at a time ("Two things this
   * week. Nothing urgent."). Regeneration only happens when there are enough moments
   * (≥3) AND something new has been captured since the last generation AND the last
   * generation is over a day old — so the surface is calm, not chatty.
   */
  async getInsights(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);

    const [active, newestMoment, momentCount] = await Promise.all([
      this.prisma.miraInsight.findMany({
        where: { childId, status: { in: ['NEW', 'WATCHING'] } },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.moment.findFirst({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.moment.count({ where: { childId } }),
    ]);

    const newestGen = active[0]?.generatedAt;
    const dayMs = 24 * 60 * 60 * 1000;
    const stale =
      !newestGen ||
      (newestMoment && newestMoment.createdAt > newestGen && Date.now() - newestGen.getTime() > dayMs);

    if (momentCount >= 3 && stale) {
      const generated = await this.generateInsights(childId);
      if (generated.length > 0) {
        // Fresh picture replaces the old NEW ones; WATCHING survives (the parent asked).
        await this.prisma.miraInsight.deleteMany({ where: { childId, status: 'NEW' } });
        await this.prisma.miraInsight.createMany({
          data: generated.map((g) => ({ childId, ...g })),
        });
      }
    }

    const insights = await this.prisma.miraInsight.findMany({
      where: { childId, status: { in: ['NEW', 'WATCHING'] } },
      orderBy: { generatedAt: 'desc' },
      take: 3,
    });

    return { insights, momentCount };
  }

  async updateInsightStatus(
    actor: Actor,
    childId: string,
    insightId: string,
    dto: UpdateInsightStatusDto,
  ) {
    await this.assertGuardian(childId, actor.id);

    const insight = await this.prisma.miraInsight.findFirst({
      where: { id: insightId, childId },
      select: { id: true },
    });
    if (!insight) throw new NotFoundException('Insight not found.');

    return this.prisma.miraInsight.update({
      where: { id: insightId },
      data: { status: dto.status },
    });
  }

  private async generateInsights(childId: string): Promise<
    Array<{
      type: 'RECURRING_CHALLENGE' | 'EMERGING_PROGRESS' | 'STRATEGY_WORKS';
      title: string;
      body: string;
      whatHelped: string | null;
      whyMatters: string | null;
      settings: string[];
      sourceMomentIds: string[];
    }>
  > {
    const moments = await this.prisma.moment.findMany({
      where: { childId, occurredAt: { gte: new Date(Date.now() - SIX_WEEKS_MS) } },
      orderBy: { occurredAt: 'desc' },
      take: 60,
      select: {
        id: true,
        text: true,
        category: true,
        place: true,
        occurredAt: true,
        domainTags: true,
      },
    });
    if (moments.length < 3) return [];

    const momentLines = moments
      .map(
        (m) =>
          `- id=${m.id} date=${m.occurredAt.toISOString().slice(0, 10)} category=${m.category ?? 'none'} place=${m.place ?? 'unknown'} domains=${m.domainTags.join(',') || 'none'}: ${m.text}`,
      )
      .join('\n');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are Mira, looking across a parent's logged everyday moments about their child for patterns worth gently surfacing. Return JSON: { "insights": [ up to 2 items ] }, each item:
{
  "type": "RECURRING_CHALLENGE" | "EMERGING_PROGRESS" | "STRATEGY_WORKS",
  "title": short plain-language headline (no jargon, hedged — "may", "seems"),
  "body": 1-3 sentences: what you noticed, grounded in the actual moments (counts, examples),
  "whatHelped": 1-2 sentences on what seemed to help, or null if nothing is evident,
  "whyMatters": one sentence on why this is worth knowing — supportive, never alarming,
  "settings": places it showed up (e.g. ["Home","Nursery"]),
  "sourceMomentIds": the ids of the moments this is drawn from (at least 2)
}
Rules: only surface a pattern with at least 2 supporting moments. Never diagnose, never use clinical labels, never present a pattern as fact. Refer to the child only as "your child". If nothing genuinely patterns, return { "insights": [] }.`,
          },
          { role: 'user', content: momentLines },
        ],
      });

      const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}');
      const items = Array.isArray(raw.insights) ? raw.insights : [];
      const validIds = new Set(moments.map((m) => m.id));

      return items
        .filter(
          (i: any) =>
            ['RECURRING_CHALLENGE', 'EMERGING_PROGRESS', 'STRATEGY_WORKS'].includes(i.type) &&
            typeof i.title === 'string' &&
            typeof i.body === 'string',
        )
        .slice(0, 2)
        .map((i: any) => ({
          type: i.type,
          title: i.title.slice(0, 200),
          body: i.body,
          whatHelped: typeof i.whatHelped === 'string' ? i.whatHelped : null,
          whyMatters: typeof i.whyMatters === 'string' ? i.whyMatters : null,
          settings: Array.isArray(i.settings) ? i.settings.slice(0, 6) : [],
          sourceMomentIds: Array.isArray(i.sourceMomentIds)
            ? i.sourceMomentIds.filter((id: string) => validIds.has(id))
            : [],
        }));
    } catch (error) {
      this.logger.warn(`Insight generation failed for child ${childId}: ${(error as Error).message}`);
      return [];
    }
  }

  // ─── progress (status-grouped, not domain-grouped) ──────────────────────────

  /**
   * "Progress that matters": every domain becomes an area with a STATUS the parent can
   * scan by — what needs me / what's going well — derived from the last six weeks of
   * moments (plus staff observations as corroboration). Plain heuristics, no AI: this
   * must be cheap, instant and explainable.
   */
  async getProgress(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);

    const since = new Date(Date.now() - SIX_WEEKS_MS);
    const [moments, observations, latestAssessment] = await Promise.all([
      this.prisma.moment.findMany({
        where: { childId, occurredAt: { gte: since } },
        orderBy: { occurredAt: 'desc' },
        select: {
          id: true,
          text: true,
          category: true,
          place: true,
          occurredAt: true,
          domainTags: true,
        },
      }),
      this.prisma.observation.findMany({
        where: { childId, observedAt: { gte: since } },
        orderBy: { observedAt: 'desc' },
        select: {
          id: true,
          note: true,
          domain: true,
          type: true,
          observedAt: true,
          facility: { select: { name: true, type: true } },
          author: { select: { name: true } },
        },
      }),
      this.prisma.assessment.findFirst({
        where: { childId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { id: true, completedAt: true, flaggedDomains: true, domainScores: true },
      }),
    ]);

    const areas = DEVELOPMENTAL_DOMAINS.map((domain) => {
      const domainMoments = moments.filter((m) => m.domainTags.includes(domain));
      const domainObs = observations.filter((o) => o.domain === domain);
      const status = this.deriveStatus(domain, domainMoments, latestAssessment?.flaggedDomains ?? []);

      const places = [...new Set(domainMoments.map((m) => m.place).filter(Boolean))] as string[];
      const facts: string[] = [];
      if (domainMoments.length > 0)
        facts.push(`${domainMoments.length} moment${domainMoments.length === 1 ? '' : 's'}`);
      if (places.length > 1) facts.push(`${places.length} settings`);
      if (domainObs.length > 0)
        facts.push(`${domainObs.length} note${domainObs.length === 1 ? '' : 's'} from ${domainObs[0].facility?.name ?? 'their setting'}`);

      return {
        domain,
        label: DOMAIN_LABELS[domain],
        status,
        facts,
        momentCount: domainMoments.length,
        places,
        latestMoment: domainMoments[0]
          ? { text: domainMoments[0].text, occurredAt: domainMoments[0].occurredAt }
          : null,
        flagged: (latestAssessment?.flaggedDomains ?? []).includes(domain),
        // Weekly counts for the 6-week trend bars, oldest week first.
        trend: this.weeklyTrend(domainMoments.map((m) => m.occurredAt)),
      };
    });

    return {
      areas,
      screening: latestAssessment
        ? {
            assessmentId: latestAssessment.id,
            completedAt: latestAssessment.completedAt,
            flaggedDomains: latestAssessment.flaggedDomains,
          }
        : null,
    };
  }

  /** The area detail: the evidence log with source attribution, parent + staff side by side. */
  async getAreaDetail(actor: Actor, childId: string, domain: string) {
    await this.assertGuardian(childId, actor.id);
    if (!(DEVELOPMENTAL_DOMAINS as readonly string[]).includes(domain)) {
      throw new NotFoundException('Unknown domain.');
    }

    const since = new Date(Date.now() - SIX_WEEKS_MS);
    const [moments, observations] = await Promise.all([
      this.prisma.moment.findMany({
        where: { childId, domainTags: { has: domain }, occurredAt: { gte: since } },
        orderBy: { occurredAt: 'desc' },
        select: this.publicShape(),
      }),
      this.prisma.observation.findMany({
        where: { childId, domain, observedAt: { gte: since } },
        orderBy: { observedAt: 'desc' },
        select: {
          id: true,
          note: true,
          type: true,
          observedAt: true,
          facility: { select: { name: true, type: true } },
          author: { select: { name: true } },
        },
      }),
    ]);

    const evidence = [
      ...moments.map((m) => ({
        id: m.id,
        date: m.occurredAt,
        text: m.text,
        place: m.place,
        sourceType: 'parent' as const,
        sourceLabel: 'You',
      })),
      ...observations.map((o) => ({
        id: o.id,
        date: o.observedAt,
        text: o.note,
        place: o.facility?.name ?? null,
        sourceType: (o.facility?.type === 'NURSERY' ? 'nursery' : 'professional') as string,
        sourceLabel: o.facility?.name ?? o.author?.name ?? 'Care team',
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      domain,
      label: DOMAIN_LABELS[domain],
      trend: this.weeklyTrend(moments.map((m) => m.occurredAt)),
      evidence,
    };
  }

  // ─── internals ──────────────────────────────────────────────────────────────

  private deriveStatus(
    domain: string,
    domainMoments: Array<{ category: MomentCategory | null; place: string | null; occurredAt: Date }>,
    flaggedDomains: string[],
  ): ProgressStatus {
    if (domainMoments.length === 0) return 'NOTHING_NEW';

    const difficult = domainMoments.filter((m) => m.category === 'DIFFICULT').length;
    const positive = domainMoments.filter(
      (m) => m.category === 'WENT_WELL' || m.category === 'MILESTONE',
    ).length;
    const places = new Set(domainMoments.map((m) => m.place).filter(Boolean));

    // Repeated difficulty (or any difficulty in a screening-flagged domain) is the one
    // group that should ask for the parent's attention.
    if (difficult >= 2 || (difficult >= 1 && flaggedDomains.includes(domain))) return 'WATCH';
    // Getting steadier and showing up in more places.
    if (positive >= 3 && (places.size >= 2 || positive > difficult * 2)) return 'IMPROVING';
    // New signs, early days.
    if (positive >= 1) return 'EMERGING';
    return 'STEADY';
  }

  private weeklyTrend(dates: Date[]): number[] {
    const weeks = new Array(6).fill(0);
    const now = Date.now();
    for (const d of dates) {
      const weeksAgo = Math.floor((now - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 6) weeks[5 - weeksAgo] += 1;
    }
    return weeks;
  }

  private async assertGuardian(childId: string, userId: string): Promise<void> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { profile: { select: { userId: true } } },
    });
    if (!child) throw new NotFoundException('Child not found.');
    if (child.profile?.userId === userId) return;

    const guardian = await this.prisma.guardian.findFirst({
      where: { childId, userId, hasAuthorityToConsent: true },
      select: { id: true },
    });
    if (guardian) return;

    throw new ForbiddenException('You do not have access to this child.');
  }

  private publicShape() {
    return {
      id: true,
      text: true,
      category: true,
      capturedVia: true,
      place: true,
      occurredAt: true,
      domainTags: true,
      createdAt: true,
    } satisfies Prisma.MomentSelect;
  }
}
