import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyAccessService, JourneyChild, WORKING_BOOKING_STATUSES } from './journey-access.service';
import { JourneyLibraryService, LibraryCard, ResourceKind } from './journey-library.service';
import { DOMAIN_KEYS, JourneyDomain, isJourneyDomain } from './domains';
import { upsertAssignedItem } from './assigned-item';
import { ItemStatus, ageInYears, concernAreas, daysAgo, itemStatus, screeningLevels, weeklyIndependence } from './journey.logic';

type Actor = { id: string; role: string };

const ITEM_INCLUDE = {
  assignedBy: { select: { id: true, name: true, image: true } },
  logs: { orderBy: { date: 'asc' as const } },
} satisfies Prisma.ChildResourceInclude;
type ItemRow = Prisma.ChildResourceGetPayload<{ include: typeof ITEM_INCLUDE }>;

const SHARE_PERIODS = [30, 90] as const;

function parseKind(kind: unknown): ResourceKind {
  if (kind === 'WORKSHEET' || kind === 'LIBRARY') return kind;
  throw new BadRequestException('kind must be WORKSHEET or LIBRARY.');
}

function parseScale(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 2) throw new BadRequestException(`${name} must be 0, 1 or 2.`);
  return n;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

@Injectable()
export class ResourceJourneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: JourneyAccessService,
    private readonly library: JourneyLibraryService,
    private readonly events: EventEmitter2,
  ) {}

  // ── the child's library ─────────────────────────────────────────────────────

  private refOf(row: { kind: string; worksheetId: string | null; libraryResourceId: string | null }) {
    return row.kind === 'WORKSHEET'
      ? { kind: 'WORKSHEET' as const, id: row.worksheetId! }
      : { kind: 'LIBRARY' as const, id: row.libraryResourceId! };
  }

  /** The area a log counts toward: the assigned area, else the resource's first area. */
  private itemDomain(item: { assignedArea: string | null }, card?: LibraryCard): JourneyDomain | null {
    if (item.assignedArea && isJourneyDomain(item.assignedArea)) return item.assignedArea;
    return card?.domains[0] ?? null;
  }

  private presentItem(item: ItemRow, card: LibraryCard | undefined, opts: { notes: boolean }) {
    const status: ItemStatus = itemStatus(item.logs, item.masteredOverride);
    const last = item.logs[item.logs.length - 1];
    return {
      id: item.id,
      childId: item.childId,
      kind: item.kind,
      resource: card ?? null,
      source: item.source,
      assignedBy: item.source === 'ASSIGNED' ? item.assignedBy : null,
      goal: item.goal,
      targetDate: item.targetDate,
      assignedArea: item.assignedArea,
      domain: this.itemDomain(item, card),
      unassigned: !!item.unassignedAt,
      masteredOverride: item.masteredOverride,
      status,
      createdAt: item.createdAt,
      logs: item.logs.map((l) => ({
        id: l.id,
        date: l.date,
        help: l.help,
        engagement: l.engagement,
        ...(opts.notes ? { note: l.note } : {}),
      })),
      lastLog: last ? { date: last.date, help: last.help, ...(opts.notes ? { note: last.note } : {}) } : null,
    };
  }

  async listItems(actor: Actor, childId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const rows = await this.prisma.childResource.findMany({
      where: { childId },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const cards = await this.library.cardsFor(actor.id, rows.map((r) => this.refOf(r)), true);
    const items = rows.map((r) => this.presentItem(r, cards.get(`${r.kind}:${this.refOf(r).id}`), { notes: true }));
    const summary: Record<string, number> = { all: items.length, 'To try': 0, Practising: 0, 'Getting there': 0, Mastered: 0 };
    for (const i of items) summary[i.status]++;
    return { items, summary };
  }

  /** Save (idempotent). Returns the item. */
  async saveItem(actor: Actor, childId: string, body: { kind?: unknown; resourceId?: unknown }) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const kind = parseKind(body.kind);
    const resourceId = String(body.resourceId ?? '');
    if (!resourceId) throw new BadRequestException('resourceId is required.');
    return this.ensureItem(actor, child, kind, resourceId);
  }

  private async ensureItem(actor: Actor, child: JourneyChild, kind: ResourceKind, resourceId: string) {
    const where =
      kind === 'WORKSHEET'
        ? { childId_worksheetId: { childId: child.id, worksheetId: resourceId } }
        : { childId_libraryResourceId: { childId: child.id, libraryResourceId: resourceId } };
    const existing = await this.prisma.childResource.findUnique({ where, include: ITEM_INCLUDE });
    if (existing) return existing;
    if (!(await this.library.isVisible(actor, kind, resourceId, child.id))) {
      throw new NotFoundException('Resource not found.');
    }
    try {
      return await this.prisma.childResource.create({
        data: {
          childId: child.id,
          kind,
          ...(kind === 'WORKSHEET' ? { worksheetId: resourceId } : { libraryResourceId: resourceId }),
          source: 'SAVED',
          savedById: actor.id,
        },
        include: ITEM_INCLUDE,
      });
    } catch (e) {
      // A concurrent save won the unique race — return that row.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.childResource.findUniqueOrThrow({ where, include: ITEM_INCLUDE });
      }
      throw e;
    }
  }

  private async guardianItem(actor: Actor, itemId: string) {
    const item = await this.prisma.childResource.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found.');
    await this.access.assertGuardian(actor.id, item.childId);
    return item;
  }

  async updateItem(actor: Actor, itemId: string, body: { mastered?: unknown }) {
    await this.guardianItem(actor, itemId);
    if (body.mastered !== true && body.mastered !== false && body.mastered !== null) {
      throw new BadRequestException('mastered must be true, false or null.');
    }
    return this.prisma.childResource.update({
      where: { id: itemId },
      data: { masteredOverride: body.mastered as boolean | null },
    });
  }

  async removeItem(actor: Actor, itemId: string) {
    const item = await this.guardianItem(actor, itemId);
    if (item.source === 'ASSIGNED' && !item.unassignedAt) {
      throw new BadRequestException('Your therapist assigned this one. Ask them if you want it removed.');
    }
    await this.prisma.childResource.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  // ── logging ─────────────────────────────────────────────────────────────────

  async log(
    actor: Actor,
    childId: string,
    body: { kind?: unknown; resourceId?: unknown; date?: unknown; help?: unknown; engagement?: unknown; note?: unknown },
  ) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const kind = parseKind(body.kind);
    const resourceId = String(body.resourceId ?? '');
    if (!resourceId) throw new BadRequestException('resourceId is required.');
    const help = parseScale(body.help, 'help');
    const engagement = parseScale(body.engagement, 'engagement');
    const date = body.date ? new Date(String(body.date)) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('date is not a valid date.');
    if (date > endOfToday()) throw new BadRequestException('You can’t log a try in the future.');
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const item = await this.ensureItem(actor, child, kind, resourceId);
    const before = itemStatus(item.logs, item.masteredOverride);
    const log = await this.prisma.activityLog.create({
      // createdAt from the same (app) clock as ChildResource.assignedAt, so the
      // "logged since assigned" comparison is not skewed by the database clock.
      data: { childResourceId: item.id, childId: child.id, loggedById: actor.id, date, help, engagement, note, createdAt: new Date() },
    });
    const after = itemStatus([...item.logs, log], item.masteredOverride);
    return { log, itemId: item.id, status: after, becameMastered: before !== 'Mastered' && after === 'Mastered' };
  }

  // ── progress ────────────────────────────────────────────────────────────────

  /**
   * Stats, weekly independence chart and timeline for a child. `sinceDays` bounds the
   * timeline (null = everything); the 30-day stats and 8-week chart are fixed windows,
   * also bounded by `sinceDays` for a therapist's share.
   */
  async progressFor(
    viewerId: string,
    child: JourneyChild,
    opts: { sinceDays: number | null; notes: boolean; domain?: string; suggestions: boolean; actor?: Actor },
  ) {
    const since = opts.sinceDays != null ? daysAgo(opts.sinceDays) : null;
    const rows = await this.prisma.childResource.findMany({
      where: { childId: child.id },
      include: ITEM_INCLUDE,
    });
    const cards = await this.library.cardsFor(viewerId, rows.map((r) => this.refOf(r)));

    type TimelineEntry = {
      id: string;
      date: Date;
      itemId: string;
      title: string;
      domain: JourneyDomain | null;
      help: number;
      engagement: number;
      note?: string | null;
      milestone: string | null;
    };
    const timeline: TimelineEntry[] = [];
    const chartLogs: Array<{ date: Date; help: number; engagement: number; domain: JourneyDomain | null }> = [];
    let mastered = 0;

    for (const r of rows) {
      const card = cards.get(`${r.kind}:${this.refOf(r).id}`);
      const domain = this.itemDomain(r, card);
      if (itemStatus(r.logs, r.masteredOverride) === 'Mastered') mastered++;
      let alone = 0;
      r.logs.forEach((l) => {
        if (l.help === 2) alone++;
        const milestone =
          l.help === 2 && alone === 1 ? 'First time on their own' : l.help === 2 && alone === 3 ? 'Mastered' : null;
        if (since && l.date < since) return;
        chartLogs.push({ date: l.date, help: l.help, engagement: l.engagement, domain });
        timeline.push({
          id: l.id,
          date: l.date,
          itemId: r.id,
          title: card?.title ?? 'Activity',
          domain,
          help: l.help,
          engagement: l.engagement,
          ...(opts.notes ? { note: l.note } : {}),
          milestone,
        });
      });
    }
    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    const last30 = daysAgo(30);
    const recent = chartLogs.filter((l) => l.date >= last30);
    const filteredTimeline =
      opts.domain && isJourneyDomain(opts.domain) ? timeline.filter((t) => t.domain === opts.domain) : timeline;

    let suggestions: unknown[] = [];
    if (opts.suggestions && opts.actor) suggestions = await this.suggestions(opts.actor, child, rows, cards);

    return {
      child: { id: child.id, firstName: child.firstName, age: ageInYears(child.dateOfBirth) },
      stats: {
        logged30: recent.length,
        areas30: new Set(recent.map((l) => l.domain).filter(Boolean)).size,
        mastered,
      },
      weekly: weeklyIndependence(chartLogs),
      timeline: filteredTimeline.slice(0, 200),
      suggestions,
    };
  }

  /** Up to 3 unsaved resources in screening areas that have nothing saved yet. */
  private async suggestions(actor: Actor, child: JourneyChild, rows: ItemRow[], cards: Map<string, LibraryCard>) {
    const screening = await this.library.latestScreening(child.id);
    if (!screening) return [];
    const levels = screeningLevels(screening.domainScores, screening.flaggedDomains);
    const covered = new Set<JourneyDomain>();
    for (const r of rows) {
      const d = this.itemDomain(r, cards.get(`${r.kind}:${this.refOf(r).id}`));
      if (d) covered.add(d);
    }
    const gaps = concernAreas(levels).filter((d) => !covered.has(d));
    if (!gaps.length) return [];
    const { items } = await this.library.list(actor, child, { ageFit: true, matchOnly: true, limit: 60 });
    return items.filter((c) => !c.savedItemId && c.domains.some((d) => gaps.includes(d))).slice(0, 3);
  }

  async progress(actor: Actor, childId: string, query: { domain?: string }) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const [data, shares] = await Promise.all([
      this.progressFor(actor.id, child, { sinceDays: null, notes: true, domain: query.domain, suggestions: true, actor }),
      this.activeShares(childId),
    ]);
    return { ...data, shares };
  }

  // ── sharing (parent) ────────────────────────────────────────────────────────

  private activeShares(childId: string) {
    return this.prisma.progressShare.findMany({
      where: { childId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        periodDays: true,
        includeNotes: true,
        createdAt: true,
        therapist: { select: { id: true, name: true, image: true } },
      },
    });
  }

  /** Therapists the parent works with for this child (booking or assignment). */
  async shareTargets(actor: Actor, childId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const [bookings, assigners] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          patientId: actor.id,
          status: { in: [...WORKING_BOOKING_STATUSES] },
          OR: [{ childId }, { childId: null }],
        },
        select: {
          startDateTime: true,
          therapist: { select: { userId: true, title: true, user: { select: { id: true, name: true, image: true } } } },
        },
        orderBy: { startDateTime: 'asc' },
      }),
      this.prisma.childResource.findMany({
        where: { childId, assignedById: { not: null } },
        select: {
          assignedBy: { select: { id: true, name: true, image: true, therapistProfile: { select: { title: true } } } },
        },
        distinct: ['assignedById'],
      }),
    ]);

    const now = new Date();
    const targets = new Map<string, { userId: string; name: string; image: string | null; role: string | null; nextSession: Date | null }>();
    for (const b of bookings) {
      const u = b.therapist.user;
      const t = targets.get(u.id) ?? { userId: u.id, name: u.name ?? 'Therapist', image: u.image, role: b.therapist.title, nextSession: null };
      if (b.startDateTime > now && (!t.nextSession || b.startDateTime < t.nextSession)) t.nextSession = b.startDateTime;
      targets.set(u.id, t);
    }
    for (const a of assigners) {
      const u = a.assignedBy;
      if (u && !targets.has(u.id)) {
        targets.set(u.id, { userId: u.id, name: u.name ?? 'Therapist', image: u.image, role: u.therapistProfile?.title ?? null, nextSession: null });
      }
    }
    return { targets: [...targets.values()] };
  }

  async listShares(actor: Actor, childId: string) {
    await this.access.assertGuardian(actor.id, childId);
    return { shares: await this.activeShares(childId) };
  }

  async createShare(actor: Actor, childId: string, body: { therapistUserId?: unknown; periodDays?: unknown; includeNotes?: unknown }) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const therapistUserId = String(body.therapistUserId ?? '');
    const { targets } = await this.shareTargets(actor, childId);
    if (!targets.some((t) => t.userId === therapistUserId)) {
      throw new BadRequestException('You can share only with a therapist you work with for this child.');
    }
    const periodDays =
      body.periodDays === null || body.periodDays === 'all' || body.periodDays === undefined
        ? null
        : Number(body.periodDays);
    if (periodDays !== null && !(SHARE_PERIODS as readonly number[]).includes(periodDays)) {
      throw new BadRequestException('periodDays must be 30, 90 or all.');
    }

    // One live share per therapist per child: a new one replaces the old.
    const [, share] = await this.prisma.$transaction([
      this.prisma.progressShare.updateMany({
        where: { childId, therapistUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.progressShare.create({
        data: { childId, parentId: actor.id, therapistUserId, periodDays, includeNotes: body.includeNotes === true },
      }),
    ]);

    this.events.emit('progress.shared', {
      shareId: share.id,
      therapistUserId,
      parentId: actor.id,
      childName: child.firstName,
    });
    return share;
  }

  async revokeShare(actor: Actor, shareId: string) {
    const share = await this.prisma.progressShare.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Share not found.');
    await this.access.assertGuardian(actor.id, share.childId);
    if (share.revokedAt) return share;
    return this.prisma.progressShare.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
  }

  // ── sharing (therapist) ─────────────────────────────────────────────────────

  async sharedWithMe(actor: Actor) {
    const shares = await this.prisma.progressShare.findMany({
      where: { therapistUserId: actor.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        periodDays: true,
        includeNotes: true,
        createdAt: true,
        parent: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true, dateOfBirth: true } },
      },
    });
    return {
      shares: shares.map((s) => ({
        ...s,
        child: { id: s.child.id, firstName: s.child.firstName, age: ageInYears(s.child.dateOfBirth) },
      })),
    };
  }

  async sharedProgress(actor: Actor, shareId: string, query: { domain?: string }) {
    const share = await this.prisma.progressShare.findFirst({
      where: { id: shareId, therapistUserId: actor.id, revokedAt: null },
      include: {
        child: { select: { id: true, firstName: true, dateOfBirth: true, profile: { select: { userId: true } } } },
        parent: { select: { name: true } },
      },
    });
    // A revoked or someone else's share looks exactly like a missing one.
    if (!share) throw new NotFoundException('Share not found.');
    const child: JourneyChild = {
      id: share.child.id,
      firstName: share.child.firstName,
      dateOfBirth: share.child.dateOfBirth,
      ownerId: share.child.profile.userId,
    };
    const data = await this.progressFor(actor.id, child, {
      sinceDays: share.periodDays,
      notes: share.includeNotes,
      domain: query.domain,
      suggestions: false,
    });
    return {
      ...data,
      share: { id: share.id, periodDays: share.periodDays, includeNotes: share.includeNotes, createdAt: share.createdAt, parentName: share.parent.name },
    };
  }

  // ── therapists: clients and assignments ─────────────────────────────────────

  async myClients(actor: Actor) {
    const children = await this.prisma.child.findMany({
      where: this.access.therapistClientsWhere(actor.id),
      select: {
        id: true,
        firstName: true,
        dateOfBirth: true,
        profile: { select: { user: { select: { id: true, name: true } } } },
        journeyResources: {
          where: { assignedById: actor.id },
          select: { id: true, assignedAt: true, logs: { select: { date: true, createdAt: true }, orderBy: { date: 'desc' } } },
        },
      },
      orderBy: { firstName: 'asc' },
      take: 500,
    });
    return {
      clients: children.map((c) => {
        const lastDates = c.journeyResources
          .map((r) => sinceAssigned(r).logs[0]?.date)
          .filter((d): d is Date => !!d);
        return {
          id: c.id,
          firstName: c.firstName,
          age: ageInYears(c.dateOfBirth),
          parent: c.profile.user,
          assignedCount: c.journeyResources.length,
          lastActivity: lastDates.length ? new Date(Math.max(...lastDates.map((d) => d.getTime()))) : null,
        };
      }),
    };
  }

  async assignable(actor: Actor, query: Record<string, string>) {
    let child: JourneyChild | null = null;
    if (query.childId) {
      const c = await this.access.assertTherapistOfChild(actor.id, query.childId);
      child = { id: c.id, firstName: c.firstName, dateOfBirth: c.dateOfBirth, ownerId: c.profile.userId };
    }
    return this.library.list(actor, child, query);
  }

  async assign(
    actor: Actor,
    childId: string,
    body: { kind?: unknown; resourceId?: unknown; goal?: unknown; targetDate?: unknown; assignedArea?: unknown },
  ) {
    const c = await this.access.assertTherapistOfChild(actor.id, childId);
    const kind = parseKind(body.kind);
    const resourceId = String(body.resourceId ?? '');
    if (!resourceId) throw new BadRequestException('resourceId is required.');
    if (!(await this.library.isVisible(actor, kind, resourceId, childId))) {
      throw new NotFoundException('Resource not found.');
    }
    const goal = typeof body.goal === 'string' && body.goal.trim() ? body.goal.trim().slice(0, 300) : null;
    const targetDate = body.targetDate ? new Date(String(body.targetDate)) : null;
    if (targetDate && Number.isNaN(targetDate.getTime())) throw new BadRequestException('targetDate is not a valid date.');
    const assignedArea = body.assignedArea ? String(body.assignedArea) : null;
    if (assignedArea && !isJourneyDomain(assignedArea)) {
      throw new BadRequestException(`assignedArea must be one of ${DOMAIN_KEYS.join(', ')}.`);
    }
    const parentId = c.profile.userId;

    const itemWrite = upsertAssignedItem(this.prisma, {
      childId,
      kind,
      resourceId,
      parentId,
      assignedById: actor.id,
      goal,
      targetDate,
      assignedArea,
    });
    // Batched: both writes commit together, with no interactive-transaction timeout.
    const results =
      kind === 'WORKSHEET'
        ? await this.prisma.$transaction([
            this.prisma.worksheetAssignment.upsert({
              where: { worksheetId_assignedToId_childId: { worksheetId: resourceId, assignedToId: parentId, childId } },
              create: { worksheetId: resourceId, assignedById: actor.id, assignedToId: parentId, childId, dueDate: targetDate, notes: goal },
              update: {},
            }),
            itemWrite,
          ])
        : await this.prisma.$transaction([itemWrite]);
    const item = results[results.length - 1] as Awaited<typeof itemWrite>;

    const card = (await this.library.cardsFor(actor.id, [{ kind, id: resourceId }])).get(`${kind}:${resourceId}`);
    this.events.emit('resource.assigned', {
      itemId: item.id,
      parentId,
      therapistUserId: actor.id,
      childName: c.firstName,
      title: card?.title ?? 'a resource',
    });
    return item;
  }

  async assignedTo(actor: Actor, childId: string) {
    await this.access.assertTherapistOfChild(actor.id, childId);
    const rows = await this.prisma.childResource.findMany({
      where: { childId, assignedById: actor.id },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const cards = await this.library.cardsFor(actor.id, rows.map((r) => this.refOf(r)));
    // The therapist sees only tries logged since they assigned it (notes included —
    // they are about their own assignment). Anything the parent logged before, on a
    // resource they had saved themselves, stays private unless the parent shares it.
    return {
      items: rows.map((r) =>
        this.presentItem(sinceAssigned(r), cards.get(`${r.kind}:${this.refOf(r).id}`), { notes: true }),
      ),
    };
  }

  async unassign(actor: Actor, itemId: string) {
    const item = await this.prisma.childResource.findUnique({
      where: { id: itemId },
      include: { _count: { select: { logs: true } } },
    });
    if (!item) throw new NotFoundException('Item not found.');
    if (item.assignedById !== actor.id) throw new ForbiddenException('Only the therapist who assigned this can remove it.');
    // A parent's history is theirs: keep the item (as no longer assigned) once it has logs.
    if (item._count.logs > 0) {
      await this.prisma.childResource.update({ where: { id: itemId }, data: { unassignedAt: new Date() } });
      return { removed: false, unassigned: true };
    }
    await this.prisma.childResource.delete({ where: { id: itemId } });
    return { removed: true, unassigned: true };
  }
}

/**
 * The item as its assigning therapist may see it: only logs created at or after the
 * assignment. Rows without `assignedAt` (never assigned) show no logs.
 */
function sinceAssigned<T extends { assignedAt: Date | null; logs: Array<{ createdAt: Date }> }>(item: T): T {
  const from = item.assignedAt;
  return { ...item, logs: from ? item.logs.filter((l) => l.createdAt >= from) : [] };
}
