import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  EDITIONS,
  Edition,
  MANAGED_DOCUMENTS,
  ManagedDocumentDef,
  ManagedDocumentType,
  contentHash,
  managedDocument,
} from './legal-documents';
import { PRIVACY_SEED, TERMS_SEED } from './legal-seed';

const SEEDS: Partial<Record<ManagedDocumentType, string>> = { TERMS: TERMS_SEED, PRIVACY: PRIVACY_SEED };
const CACHE_MS = 60_000;
const MAX_CONTENT = 200_000;

/** The published text of one document, as the public pages and the gate see it. */
export interface PublishedDocument {
  type: ManagedDocumentType;
  edition: Edition;
  title: string;
  version: string;
  acceptanceVersion: string;
  content: string;
  contentHash: string;
  publishedAt: Date | null;
  url: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Versioned legal documents, edited by platform admins.
 *
 *   - A PUBLISHED version is never edited: a change is a new DRAFT that is published in
 *     its place, and the old one becomes SUPERSEDED. Every version stays readable.
 *   - Publishing asks "should everyone accept again?". Yes moves the acceptance version
 *     to the new one (the in-app gate prompts every user); no keeps it (a wording fix).
 *   - Terms and Privacy are seeded from the text the site showed before this existed,
 *     so nothing changes for users on the day it ships.
 */
@Injectable()
export class LegalDocumentsService implements OnModuleInit {
  private readonly logger = new Logger(LegalDocumentsService.name);
  private cache = new Map<string, { at: number; doc: PublishedDocument | null }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    try {
      await this.seed();
    } catch (error) {
      // The built-in text keeps serving; the next boot tries again.
      this.logger.warn(`Legal documents seed skipped: ${(error as Error).message}`);
    }
  }

  /** First publish of Terms / Privacy from the built-in text, once. Safe on many replicas. */
  private async seed() {
    for (const def of MANAGED_DOCUMENTS) {
      const content = SEEDS[def.type];
      if (!content || !def.seedVersion) continue;
      const exists = await this.prisma.legalDocumentVersion.count({ where: { type: def.type, edition: 'GLOBAL' } });
      if (exists) continue;
      try {
        await this.prisma.legalDocumentVersion.create({
          data: {
            type: def.type,
            edition: 'GLOBAL',
            version: def.seedVersion,
            acceptanceVersion: def.seedVersion,
            status: 'PUBLISHED',
            title: def.title,
            content,
            contentHash: contentHash(content),
            changeSummary: 'First version (moved from the website into the admin console)',
            publishedAt: new Date(`${def.seedVersion}T00:00:00Z`),
          },
        });
        this.logger.log(`Seeded ${def.type} ${def.seedVersion}`);
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
  }

  // ═══ Public ════════════════════════════════════════════════════════════════

  /**
   * The current text of a document. A requested edition falls back to GLOBAL when it has
   * not been published; Terms / Privacy fall back to the built-in text if the database
   * cannot be read, so the site never shows an empty legal page.
   */
  async current(type: ManagedDocumentType, edition: Edition = 'GLOBAL'): Promise<PublishedDocument | null> {
    const key = `${type}:${edition}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.doc;

    const def = managedDocument(type)!;
    let doc: PublishedDocument | null = null;
    try {
      const row = await this.prisma.legalDocumentVersion.findFirst({
        where: { type, edition, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
      });
      if (row) doc = this.toPublished(row, def);
      else if (edition !== 'GLOBAL') doc = await this.current(type, 'GLOBAL');
      else doc = this.seedDocument(def);
    } catch (e) {
      this.logger.error(`Reading ${type} failed: ${(e as Error).message}`);
      return hit?.doc ?? this.seedDocument(def);
    }
    this.cache.set(key, { at: Date.now(), doc });
    return doc;
  }

  async currentBySlug(slug: string, edition?: string) {
    const def = managedDocument(slug);
    if (!def) throw new NotFoundException('Document not found.');
    const doc = await this.current(def.type, this.edition(edition));
    if (!doc) throw new NotFoundException(`${def.title} has not been published yet.`);
    return doc;
  }

  /** A past version, e.g. the one a user accepted. */
  async version(slug: string, version: string, edition?: string) {
    const def = managedDocument(slug);
    if (!def) throw new NotFoundException('Document not found.');
    const row = await this.prisma.legalDocumentVersion.findFirst({
      where: { type: def.type, edition: this.edition(edition), version, status: { in: ['PUBLISHED', 'SUPERSEDED'] } },
    });
    if (!row) throw new NotFoundException('That version does not exist.');
    return this.toPublished(row, def);
  }

  /** Published history, newest first (public: users may see what changed). */
  async history(slug: string, edition?: string) {
    const def = managedDocument(slug);
    if (!def) throw new NotFoundException('Document not found.');
    return this.prisma.legalDocumentVersion.findMany({
      where: { type: def.type, edition: this.edition(edition), status: { in: ['PUBLISHED', 'SUPERSEDED'] } },
      orderBy: { publishedAt: 'desc' },
      select: { version: true, acceptanceVersion: true, changeSummary: true, publishedAt: true, status: true },
    });
  }

  // ═══ Admin ═════════════════════════════════════════════════════════════════

  /** Every document × edition with its current published version and any open draft. */
  async overview() {
    const rows = await this.prisma.legalDocumentVersion.findMany({
      where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
      select: {
        id: true, type: true, edition: true, status: true, version: true, acceptanceVersion: true,
        title: true, changeSummary: true, publishedAt: true, updatedAt: true,
      },
    });
    return MANAGED_DOCUMENTS.flatMap((def) =>
      EDITIONS.map((edition) => ({
        type: def.type,
        slug: def.slug,
        title: def.title,
        url: def.url,
        requiredForAll: def.requiredForAll,
        edition,
        published: rows.find((r) => r.type === def.type && r.edition === edition && r.status === 'PUBLISHED') ?? null,
        draft: rows.find((r) => r.type === def.type && r.edition === edition && r.status === 'DRAFT') ?? null,
      })),
    );
  }

  async adminHistory(type: string, edition?: string) {
    const def = this.def(type);
    return this.prisma.legalDocumentVersion.findMany({
      where: { type: def.type, edition: this.edition(edition) },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      select: {
        id: true, status: true, version: true, acceptanceVersion: true, title: true, changeSummary: true,
        publishedAt: true, publishedById: true, createdById: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async get(id: string) {
    const row = await this.prisma.legalDocumentVersion.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Version not found.');
    return row;
  }

  /** Open (or return) the draft for a document, starting from its current text. */
  async startDraft(actorId: string, type: string, editionRaw?: string) {
    const def = this.def(type);
    const edition = this.edition(editionRaw);
    const existing = await this.prisma.legalDocumentVersion.findFirst({ where: { type: def.type, edition, status: 'DRAFT' } });
    if (existing) return existing;

    const base =
      (await this.prisma.legalDocumentVersion.findFirst({
        where: { type: def.type, edition, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
      })) ??
      (edition !== 'GLOBAL'
        ? await this.prisma.legalDocumentVersion.findFirst({
            where: { type: def.type, edition: 'GLOBAL', status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
          })
        : null);
    const content = base?.content ?? SEEDS[def.type] ?? `# ${def.title}\n\nWrite the document here.\n`;
    const draft = await this.prisma.legalDocumentVersion.create({
      data: {
        type: def.type,
        edition,
        status: 'DRAFT',
        title: base?.title ?? def.title,
        content,
        contentHash: contentHash(content),
        createdById: actorId,
      },
    });
    await this.audit.log({ userId: actorId, resourceType: 'legal_document', resourceId: draft.id, action: 'LEGAL_DRAFT_STARTED', metadata: { type: def.type, edition } });
    return draft;
  }

  async updateDraft(actorId: string, id: string, body: { title?: unknown; content?: unknown; changeSummary?: unknown }) {
    const row = await this.get(id);
    if (row.status !== 'DRAFT') throw new BadRequestException('Published versions cannot be edited. Start a new draft.');
    const data: Prisma.LegalDocumentVersionUpdateInput = {};
    if (typeof body.title === 'string') {
      if (!body.title.trim()) throw new BadRequestException('Title is required.');
      data.title = body.title.trim().slice(0, 200);
    }
    if (typeof body.content === 'string') {
      if (!body.content.trim()) throw new BadRequestException('The document is empty.');
      if (body.content.length > MAX_CONTENT) throw new BadRequestException('The document is too long.');
      data.content = body.content;
      data.contentHash = contentHash(body.content);
    }
    if (typeof body.changeSummary === 'string') data.changeSummary = body.changeSummary.trim().slice(0, 300) || null;
    return this.prisma.legalDocumentVersion.update({ where: { id }, data });
  }

  async discardDraft(actorId: string, id: string) {
    const row = await this.get(id);
    if (row.status !== 'DRAFT') throw new BadRequestException('Only a draft can be discarded.');
    await this.prisma.legalDocumentVersion.delete({ where: { id } });
    await this.audit.log({ userId: actorId, resourceType: 'legal_document', resourceId: id, action: 'LEGAL_DRAFT_DISCARDED', metadata: { type: row.type, edition: row.edition } });
    return { discarded: true };
  }

  /**
   * Publish a draft. `requireAcceptance` asks every user to accept again (Terms / Privacy
   * only); otherwise the acceptance version carries over and nobody is prompted.
   */
  async publish(actorId: string, id: string, body: { requireAcceptance?: unknown; changeSummary?: unknown }) {
    const draft = await this.get(id);
    if (draft.status !== 'DRAFT') throw new BadRequestException('This version is already published.');
    const def = this.def(draft.type);
    const summary =
      (typeof body.changeSummary === 'string' && body.changeSummary.trim()) || draft.changeSummary || null;
    if (!summary) throw new BadRequestException('Describe what changed, for the version history.');

    const result = await this.prisma.$transaction(async (tx) => {
      const prev = await tx.legalDocumentVersion.findFirst({
        where: { type: draft.type, edition: draft.edition, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
      });
      if (prev && prev.contentHash === draft.contentHash && prev.title === draft.title) {
        throw new BadRequestException('Nothing has changed since the published version.');
      }
      // "2026-10-17", then "2026-10-17.2" for a second publish the same day.
      let version = today();
      for (let n = 2; await tx.legalDocumentVersion.count({ where: { type: draft.type, edition: draft.edition, version } }); n++) {
        version = `${today()}.${n}`;
      }
      const reaccept = body.requireAcceptance === true || !prev?.acceptanceVersion;
      if (prev) await tx.legalDocumentVersion.update({ where: { id: prev.id }, data: { status: 'SUPERSEDED' } });
      return tx.legalDocumentVersion.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          version,
          acceptanceVersion: reaccept ? version : prev!.acceptanceVersion,
          changeSummary: summary.slice(0, 300),
          publishedById: actorId,
          publishedAt: new Date(),
        },
      });
    }, { timeout: 30_000 });

    this.cache.clear();
    await this.audit.log({
      userId: actorId,
      resourceType: 'legal_document',
      resourceId: result.id,
      action: 'LEGAL_PUBLISHED',
      metadata: {
        type: def.type,
        edition: result.edition,
        version: result.version,
        acceptanceVersion: result.acceptanceVersion,
        requiresAcceptance: result.acceptanceVersion === result.version,
        contentHash: result.contentHash,
      },
    });
    return result;
  }

  // ═══ internals ═════════════════════════════════════════════════════════════

  private def(type: string): ManagedDocumentDef {
    const def = managedDocument(type);
    if (!def) throw new NotFoundException('Document not found.');
    return def;
  }

  private edition(raw?: string): Edition {
    const e = (raw ?? 'GLOBAL').toUpperCase();
    if (!(EDITIONS as readonly string[]).includes(e)) throw new BadRequestException(`Edition must be one of ${EDITIONS.join(', ')}.`);
    return e as Edition;
  }

  private seedDocument(def: ManagedDocumentDef): PublishedDocument | null {
    const content = SEEDS[def.type];
    if (!content || !def.seedVersion) return null;
    return {
      type: def.type,
      edition: 'GLOBAL',
      title: def.title,
      version: def.seedVersion,
      acceptanceVersion: def.seedVersion,
      content,
      contentHash: contentHash(content),
      publishedAt: new Date(`${def.seedVersion}T00:00:00Z`),
      url: def.url,
    };
  }

  private toPublished(
    row: { type: string; edition: string; title: string; version: string | null; acceptanceVersion: string | null; content: string; contentHash: string; publishedAt: Date | null },
    def: ManagedDocumentDef,
  ): PublishedDocument {
    return {
      type: def.type,
      edition: row.edition as Edition,
      title: row.title,
      version: row.version!,
      acceptanceVersion: row.acceptanceVersion ?? row.version!,
      content: row.content,
      contentHash: row.contentHash,
      publishedAt: row.publishedAt,
      url: def.url,
    };
  }

  /** For callers that guard publish by role. */
  static assertCanPublish(role: string) {
    if (role !== 'SUPERADMIN') throw new ForbiddenException('Only a super admin can publish legal documents.');
  }
}
