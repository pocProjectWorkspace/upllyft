import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LibraryResourcesService } from '../library-resources/library-resources.service';
import { DOMAIN_KEYS, JourneyDomain, isJourneyDomain } from './domains';
import {
  CONCERN_TEXT,
  CardType,
  ItemStatus,
  ScreeningLevel,
  ageInYears,
  concernAreas,
  fitsAge,
  itemStatus,
  libraryCardType,
  screeningLevels,
  worksheetAreas,
  worksheetCardType,
} from './journey.logic';
import type { JourneyChild } from './journey-access.service';

export type ResourceKind = 'WORKSHEET' | 'LIBRARY';

/** One card in the merged library — the same shape for worksheets and uploaded files. */
export interface LibraryCard {
  kind: ResourceKind;
  id: string;
  title: string;
  description: string | null;
  type: CardType;
  domains: JourneyDomain[];
  durationMinutes: number | null;
  ageMin: number | null;
  ageMax: number | null;
  practises: string | null;
  forText: string | null;
  source: string;
  createdAt: Date;
  /** Files only: signed links (page items only). Worksheets open at /resources/:id. */
  fileUrl?: string | null;
  downloadUrl?: string | null;
  mimeType?: string | null;
}

export interface LibraryQuery {
  q?: string;
  type?: string;
  domain?: string;
  ageFit?: string | boolean;
  matchOnly?: string | boolean;
  page?: string | number;
  limit?: string | number;
}

/** Upper bound per source before in-memory merge; libraries are tens–hundreds of rows. */
const SOURCE_CAP = 500;

const WORKSHEET_SELECT = {
  id: true,
  title: true,
  subType: true,
  targetDomains: true,
  ageRangeMin: true,
  ageRangeMax: true,
  durationMinutes: true,
  practises: true,
  forText: true,
  createdAt: true,
  createdById: true,
  metadata: true,
} satisfies Prisma.WorksheetSelect;

const LIBRARY_SELECT = {
  id: true,
  title: true,
  description: true,
  resourceType: true,
  tags: true,
  domains: true,
  ageMin: true,
  ageMax: true,
  durationMinutes: true,
  practises: true,
  forText: true,
  createdAt: true,
  mimeType: true,
  storagePath: true,
  fileUrl: true,
  downloadable: true,
  organization: { select: { name: true } },
} satisfies Prisma.LibraryResourceSelect;

type WorksheetRow = Prisma.WorksheetGetPayload<{ select: typeof WORKSHEET_SELECT }>;
type LibraryRow = Prisma.LibraryResourceGetPayload<{ select: typeof LIBRARY_SELECT }>;

const truthy = (v: unknown) => v === true || v === 'true' || v === '1';

/**
 * The merged Resources library: published worksheets (public, or the viewer's own, or
 * made for this child) + uploaded library files the viewer is in the audience of
 * (LibraryResourcesService.visibleTo — the one audience rule, not a copy).
 */
@Injectable()
export class JourneyLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libraryResources: LibraryResourcesService,
  ) {}

  // ── cards ───────────────────────────────────────────────────────────────────

  worksheetCard(w: WorksheetRow, viewerId: string): LibraryCard {
    const description = (w.metadata as any)?.description ?? null;
    return {
      kind: 'WORKSHEET',
      id: w.id,
      title: w.title,
      description: typeof description === 'string' ? description : null,
      type: worksheetCardType(w.subType),
      domains: worksheetAreas(w.targetDomains),
      durationMinutes: w.durationMinutes,
      ageMin: w.ageRangeMin,
      ageMax: w.ageRangeMax,
      practises: w.practises,
      forText: w.forText,
      source: w.createdById === viewerId ? 'You' : 'Upllyft',
      createdAt: w.createdAt,
    };
  }

  libraryCard(r: LibraryRow): LibraryCard {
    return {
      kind: 'LIBRARY',
      id: r.id,
      title: r.title,
      description: r.description,
      type: libraryCardType(r.resourceType, r.tags),
      domains: r.domains.filter(isJourneyDomain),
      durationMinutes: r.durationMinutes,
      ageMin: r.ageMin,
      ageMax: r.ageMax,
      practises: r.practises,
      forText: r.forText,
      source: r.organization?.name ?? 'Upllyft',
      createdAt: r.createdAt,
      mimeType: r.mimeType,
    };
  }

  /** Cards for specific resources (the child's library, Mira cards). Ignores audience. */
  async cardsFor(viewerId: string, refs: Array<{ kind: ResourceKind; id: string }>, sign = false) {
    const wIds = refs.filter((r) => r.kind === 'WORKSHEET').map((r) => r.id);
    const lIds = refs.filter((r) => r.kind === 'LIBRARY').map((r) => r.id);
    const [ws, ls] = await Promise.all([
      wIds.length ? this.prisma.worksheet.findMany({ where: { id: { in: wIds } }, select: WORKSHEET_SELECT }) : [],
      lIds.length ? this.prisma.libraryResource.findMany({ where: { id: { in: lIds } }, select: LIBRARY_SELECT }) : [],
    ]);
    const map = new Map<string, LibraryCard>();
    for (const w of ws) map.set(`WORKSHEET:${w.id}`, this.worksheetCard(w, viewerId));
    for (const l of ls) map.set(`LIBRARY:${l.id}`, this.libraryCard(l));
    if (sign && ls.length) await this.attachLinks(ls, map);
    return map;
  }

  private async attachLinks(rows: LibraryRow[], cards: Map<string, LibraryCard>) {
    const links = await this.libraryResources.signedLinks(rows);
    for (const r of rows) {
      const card = cards.get(`LIBRARY:${r.id}`);
      const link = links.get(r.id);
      if (card && link) Object.assign(card, link);
    }
  }

  // ── visibility ──────────────────────────────────────────────────────────────

  /** Can this viewer see this resource in the library? */
  async isVisible(actor: { id: string; role: string }, kind: ResourceKind, id: string, childId?: string) {
    if (kind === 'WORKSHEET') {
      const n = await this.prisma.worksheet.count({ where: { id, ...this.worksheetWhere(actor.id, childId) } });
      return n > 0;
    }
    const visible = await this.libraryResources.visibleTo(actor);
    const n = await this.prisma.libraryResource.count({ where: { AND: [{ id }, visible] } });
    return n > 0;
  }

  private worksheetWhere(viewerId: string, childId?: string): Prisma.WorksheetWhereInput {
    return {
      status: 'PUBLISHED',
      OR: [
        { isPublic: true },
        { createdById: viewerId },
        ...(childId ? [{ childId }] : []),
      ],
    };
  }

  // ── screening ───────────────────────────────────────────────────────────────

  /** The latest finished first-tier screening for the child, or null. */
  async latestScreening(childId: string) {
    return this.prisma.assessment.findFirst({
      where: { childId, tier1Completed: true },
      orderBy: [{ tier1CompletedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, domainScores: true, flaggedDomains: true, completedAt: true, tier1CompletedAt: true },
    });
  }

  // ── the merged list ─────────────────────────────────────────────────────────

  /**
   * Merged, filtered, ranked page of cards. Constant query count:
   * worksheets + library (+ visibleTo's 2) + child items + screening.
   * `child` is null for a therapist browsing without a client selected.
   */
  async list(
    actor: { id: string; role: string },
    child: JourneyChild | null,
    query: LibraryQuery,
    /**
     * Guardian views only. The child's saved status (built from every private log) and
     * screening match are the family's — a therapist browsing for a client gets age fit
     * and nothing else about the child.
     */
    opts: { privateChildData: boolean } = { privateChildData: true },
  ) {
    const privateChild = opts.privateChildData ? child : null;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(query.limit) || 24));
    const q = query.q?.trim();
    const contains = q ? { contains: q, mode: 'insensitive' as const } : undefined;

    const visible = await this.libraryResources.visibleTo(actor);
    const [worksheets, files, items, screening] = await Promise.all([
      this.prisma.worksheet.findMany({
        where: { AND: [this.worksheetWhere(actor.id, child?.id), ...(contains ? [{ title: contains }] : [])] },
        select: WORKSHEET_SELECT,
        orderBy: { createdAt: 'desc' },
        take: SOURCE_CAP,
      }),
      this.prisma.libraryResource.findMany({
        where: {
          AND: [visible, ...(contains ? [{ OR: [{ title: contains }, { description: contains }, { practises: contains }] }] : [])],
        },
        select: LIBRARY_SELECT,
        orderBy: { createdAt: 'desc' },
        take: SOURCE_CAP,
      }),
      privateChild
        ? this.prisma.childResource.findMany({
            where: { childId: privateChild.id },
            select: {
              id: true,
              worksheetId: true,
              libraryResourceId: true,
              masteredOverride: true,
              logs: { select: { date: true, help: true, engagement: true } },
            },
          })
        : Promise.resolve([]),
      privateChild ? this.latestScreening(privateChild.id) : Promise.resolve(null),
    ]);

    const levels = screening ? screeningLevels(screening.domainScores, screening.flaggedDomains) : {};
    const concerns = new Set(concernAreas(levels));
    const age = child ? ageInYears(child.dateOfBirth) : null;

    const saved = new Map<string, { id: string; status: ItemStatus }>();
    for (const it of items) {
      const key = it.worksheetId ? `WORKSHEET:${it.worksheetId}` : `LIBRARY:${it.libraryResourceId}`;
      saved.set(key, { id: it.id, status: itemStatus(it.logs, it.masteredOverride) });
    }

    let cards = [
      ...worksheets.map((w) => this.worksheetCard(w, actor.id)),
      ...files.map((f) => this.libraryCard(f)),
    ].map((c) => ({
      ...c,
      matchesScreening: c.domains.some((d) => concerns.has(d)),
      fitsAge: fitsAge(age, c.ageMin, c.ageMax),
      savedItemId: saved.get(`${c.kind}:${c.id}`)?.id ?? null,
      status: saved.get(`${c.kind}:${c.id}`)?.status ?? null,
    }));

    // Facet counts are taken before the type/domain filters so chips stay meaningful.
    const ageScoped = truthy(query.ageFit) ? cards.filter((c) => c.fitsAge) : cards;
    const byDomain = Object.fromEntries(DOMAIN_KEYS.map((k) => [k, ageScoped.filter((c) => c.domains.includes(k)).length]));
    const byType: Record<string, number> = { All: ageScoped.length };
    for (const c of ageScoped) byType[c.type] = (byType[c.type] ?? 0) + 1;

    cards = ageScoped;
    if (query.type && query.type !== 'All') cards = cards.filter((c) => c.type === query.type);
    if (query.domain && isJourneyDomain(query.domain)) cards = cards.filter((c) => c.domains.includes(query.domain as JourneyDomain));
    if (truthy(query.matchOnly)) cards = cards.filter((c) => c.matchesScreening);

    cards.sort(
      (a, b) =>
        Number(b.matchesScreening) - Number(a.matchesScreening) ||
        Number(b.fitsAge) - Number(a.fitsAge) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = cards.length;
    const pageCards = cards.slice((page - 1) * limit, page * limit);

    // Sign only the files on this page.
    const pageFiles = files.filter((f) => pageCards.some((c) => c.kind === 'LIBRARY' && c.id === f.id));
    if (pageFiles.length) {
      const links = await this.libraryResources.signedLinks(pageFiles);
      for (const c of pageCards) if (c.kind === 'LIBRARY') Object.assign(c, links.get(c.id) ?? {});
    }

    return {
      items: pageCards,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      facets: { byDomain, byType },
    };
  }

  /** The screening card: per-area levels, findings, and how many resources fit each. */
  async screeningSummary(actor: { id: string; role: string }, child: JourneyChild) {
    const screening = await this.latestScreening(child.id);
    if (!screening) return null;
    const levels = screeningLevels(screening.domainScores, screening.flaggedDomains);
    const areas = concernAreas(levels);

    const { facets } = await this.list(actor, child, { limit: 1, ageFit: true });
    return {
      assessmentId: screening.id,
      completedAt: screening.completedAt ?? screening.tier1CompletedAt,
      areas: DOMAIN_KEYS.map((k) => ({ domain: k, level: (levels[k] ?? null) as ScreeningLevel | null })),
      findings: areas.map((d) => ({
        domain: d,
        level: levels[d] as ScreeningLevel,
        text: CONCERN_TEXT[d],
        count: facets.byDomain[d] ?? 0,
      })),
    };
  }
}
