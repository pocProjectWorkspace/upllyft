import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorksheetStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LibraryResourcesService } from '../library-resources/library-resources.service';
import { JourneyLibraryService } from '../resource-journey/journey-library.service';
import type { ResourceKind } from '../resource-journey/journey-library.service';

type Actor = { id: string; role: string };

const MAX_COLLECTIONS = 50;
const SAVED_CAP = 500;

/**
 * Therapist My Library (handoff "My Library v2"): what they saved from the Resource
 * Library ("Your Resources") and what they made themselves ("Create New").
 *
 * Saved cards are built by the Resources journey's card builder, so type, areas and
 * ages read the same as everywhere else in Resources. Usage is derived from their
 * assignments (resource-journey ChildResource rows they assigned).
 */
@Injectable()
export class MyLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journeyLibrary: JourneyLibraryService,
    private readonly libraryResources: LibraryResourcesService,
  ) {}

  private assertProfessional(actor: Actor) {
    // Parents have their own Resources journey (their child's library).
    if (actor.role === 'USER') throw new ForbiddenException('My Library is for professionals.');
  }

  private parseKind(kind: string): ResourceKind {
    if (kind === 'WORKSHEET' || kind === 'LIBRARY') return kind;
    throw new BadRequestException('kind must be WORKSHEET or LIBRARY.');
  }

  private refWhere(kind: ResourceKind, id: string) {
    return kind === 'WORKSHEET' ? { worksheetId: id } : { libraryResourceId: id };
  }

  // ── Your Resources ──────────────────────────────────────────────────────────

  async listSaved(actor: Actor) {
    this.assertProfessional(actor);
    const [rows, collections, createdCount] = await Promise.all([
      this.prisma.savedResource.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: 'desc' },
        take: SAVED_CAP,
        select: {
          id: true,
          kind: true,
          worksheetId: true,
          libraryResourceId: true,
          createdAt: true,
          collections: { select: { collectionId: true } },
        },
      }),
      this.prisma.resourceCollection.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.worksheet.count({ where: { createdById: actor.id, status: { not: WorksheetStatus.ARCHIVED } } }),
    ]);

    const wIds = rows.flatMap((r) => (r.worksheetId ? [r.worksheetId] : []));
    const lIds = rows.flatMap((r) => (r.libraryResourceId ? [r.libraryResourceId] : []));

    // Still in the Resource Library for this viewer: a worksheet its author unpublished
    // or a file whose audience changed drops out rather than showing a dead card.
    const visible = await this.libraryResources.visibleTo(actor);
    const [worksheets, files, usageRows] = await Promise.all([
      wIds.length
        ? this.prisma.worksheet.findMany({
            where: {
              id: { in: wIds },
              status: WorksheetStatus.PUBLISHED,
              OR: [{ isPublic: true }, { createdById: actor.id }],
            },
            select: { id: true, difficulty: true, previewUrl: true, isPublic: true, createdById: true },
          })
        : ([] as Array<{ id: string; difficulty: string; previewUrl: string | null; isPublic: boolean; createdById: string }>),
      lIds.length
        ? this.prisma.libraryResource.findMany({ where: { AND: [{ id: { in: lIds } }, visible] }, select: { id: true } })
        : [],
      rows.length
        ? this.prisma.childResource.findMany({
            where: {
              assignedById: actor.id,
              OR: [
                ...(wIds.length ? [{ worksheetId: { in: wIds } }] : []),
                ...(lIds.length ? [{ libraryResourceId: { in: lIds } }] : []),
              ],
            },
            select: { childId: true, worksheetId: true, libraryResourceId: true, assignedAt: true },
          })
        : [],
    ]);
    const wMeta = new Map(worksheets.map((w) => [w.id, w] as const));
    const visibleFiles = new Set(files.map((f) => f.id));

    const live = rows.filter((r) =>
      r.worksheetId ? wMeta.has(r.worksheetId) : !!r.libraryResourceId && visibleFiles.has(r.libraryResourceId),
    );
    const refs = live.map((r) => ({
      kind: r.kind as ResourceKind,
      id: (r.worksheetId ?? r.libraryResourceId)!,
    }));
    const cards = await this.journeyLibrary.cardsFor(actor.id, refs, true);

    const usage = new Map<string, { children: Set<string>; last: Date | null }>();
    for (const u of usageRows) {
      const key = u.worksheetId ? `WORKSHEET:${u.worksheetId}` : `LIBRARY:${u.libraryResourceId}`;
      const e = usage.get(key) ?? { children: new Set<string>(), last: null };
      e.children.add(u.childId);
      if (u.assignedAt && (!e.last || u.assignedAt > e.last)) e.last = u.assignedAt;
      usage.set(key, e);
    }

    const items = live.flatMap((r) => {
      const ref = { kind: r.kind as ResourceKind, id: (r.worksheetId ?? r.libraryResourceId)! };
      const card = cards.get(`${ref.kind}:${ref.id}`);
      if (!card) return [];
      const w = r.worksheetId ? wMeta.get(r.worksheetId) : undefined;
      const u = usage.get(`${ref.kind}:${ref.id}`);
      return [
        {
          ...card,
          savedId: r.id,
          savedAt: r.createdAt,
          difficulty: w?.difficulty ?? null,
          thumbnailUrl: w?.previewUrl ?? null,
          collectionIds: r.collections.map((c) => c.collectionId),
          usage: { clientCount: u?.children.size ?? 0, lastUsedAt: u?.last ?? null },
          // An editable copy needs a worksheet someone else published; files are fixed.
          canCustomise: !!w && w.isPublic && w.createdById !== actor.id,
        },
      ];
    });

    return {
      items,
      collections: collections.map((c) => ({
        ...c,
        count: items.filter((i) => i.collectionIds.includes(c.id)).length,
      })),
      counts: { saved: items.length, created: createdCount },
    };
  }

  /** Which Resource Library items the viewer has saved, for the bookmark buttons. */
  async savedRefs(actor: Actor) {
    const rows = await this.prisma.savedResource.findMany({
      where: { userId: actor.id },
      select: { worksheetId: true, libraryResourceId: true },
    });
    return {
      worksheetIds: rows.flatMap((r) => (r.worksheetId ? [r.worksheetId] : [])),
      libraryResourceIds: rows.flatMap((r) => (r.libraryResourceId ? [r.libraryResourceId] : [])),
    };
  }

  async save(actor: Actor, kindRaw: string, id: string) {
    this.assertProfessional(actor);
    const kind = this.parseKind(kindRaw);
    if (!(await this.journeyLibrary.isVisible(actor, kind, id))) throw new NotFoundException('Resource not found.');
    const existing = await this.prisma.savedResource.findFirst({
      where: { userId: actor.id, ...this.refWhere(kind, id) },
      select: { id: true },
    });
    if (existing) return { saved: true, id: existing.id };
    try {
      const row = await this.prisma.savedResource.create({
        data: { userId: actor.id, kind, ...this.refWhere(kind, id) },
        select: { id: true },
      });
      return { saved: true, id: row.id };
    } catch (e) {
      // A double click raced the first save: it is saved either way.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { saved: true };
      throw e;
    }
  }

  async unsave(actor: Actor, kindRaw: string, id: string) {
    const kind = this.parseKind(kindRaw);
    await this.prisma.savedResource.deleteMany({ where: { userId: actor.id, ...this.refWhere(kind, id) } });
    return { saved: false };
  }

  // ── collections ────────────────────────────────────────────────────────────

  async createCollection(actor: Actor, nameRaw: unknown) {
    this.assertProfessional(actor);
    const name = typeof nameRaw === 'string' ? nameRaw.trim().slice(0, 60) : '';
    if (!name) throw new BadRequestException('A collection needs a name.');
    const count = await this.prisma.resourceCollection.count({ where: { userId: actor.id } });
    if (count >= MAX_COLLECTIONS) throw new BadRequestException(`You can have up to ${MAX_COLLECTIONS} collections.`);
    return this.prisma.resourceCollection.create({
      data: { userId: actor.id, name },
      select: { id: true, name: true },
    });
  }

  /** Add saved resources (by savedId) to one of the viewer's collections. */
  async addToCollection(actor: Actor, collectionId: string, savedIdsRaw: unknown) {
    const savedIds = Array.isArray(savedIdsRaw) ? savedIdsRaw.filter((x): x is string => typeof x === 'string') : [];
    if (!savedIds.length) throw new BadRequestException('Pick at least one resource.');
    const collection = await this.prisma.resourceCollection.findFirst({
      where: { id: collectionId, userId: actor.id },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException('Collection not found.');
    const owned = await this.prisma.savedResource.findMany({
      where: { id: { in: savedIds }, userId: actor.id },
      select: { id: true },
    });
    if (owned.length) {
      await this.prisma.resourceCollectionItem.createMany({
        data: owned.map((s) => ({ collectionId, savedResourceId: s.id })),
        skipDuplicates: true,
      });
    }
    return { added: owned.length };
  }

  // ── Create New ─────────────────────────────────────────────────────────────

  async listCreations(actor: Actor) {
    this.assertProfessional(actor);
    const rows = await this.prisma.worksheet.findMany({
      where: { createdById: actor.id, status: { not: WorksheetStatus.ARCHIVED } },
      orderBy: { updatedAt: 'desc' },
      take: SAVED_CAP,
      select: {
        id: true,
        title: true,
        type: true,
        subType: true,
        difficulty: true,
        targetDomains: true,
        status: true,
        previewUrl: true,
        isPublic: true,
        updatedAt: true,
        clonedFrom: { select: { title: true } },
      },
    });
    const items = rows.map(({ clonedFrom, status, ...w }) => ({
      ...w,
      // Still being made (or generating) reads as a draft; FLAGGED is still the
      // author's finished work.
      status: status === WorksheetStatus.DRAFT || status === WorksheetStatus.GENERATING ? 'DRAFT' : 'PUBLISHED',
      generating: status === WorksheetStatus.GENERATING,
      basedOn: clonedFrom?.title ?? null,
    }));
    const draft = items.filter((i) => i.status === 'DRAFT').length;
    return { items, counts: { all: items.length, draft, published: items.length - draft } };
  }
}
