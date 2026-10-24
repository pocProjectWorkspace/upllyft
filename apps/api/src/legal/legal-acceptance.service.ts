import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AGE_18_PLUS_VERSION,
  LegalDocument,
  LegalDocumentType,
  MANAGED_DOCUMENTS,
  STATEMENTS,
  statementHash,
} from './legal-documents';
import { LegalDocumentsService } from './legal-documents.service';

export type AcceptanceSource = 'REGISTER' | 'GATE';

export interface AcceptanceContext {
  source: AcceptanceSource;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Records acceptance of the platform's legal documents (Legal Pack: "Registration
 * acceptance" table). Rows are append-only: a new version adds a row, nothing is
 * updated or removed.
 *
 * The version a user accepts is the document's ACCEPTANCE version, which an admin moves
 * forward only when publishing a change that everyone must accept again (/admin/legal).
 */
@Injectable()
export class LegalAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: LegalDocumentsService,
  ) {}

  /** Terms and Privacy at their current acceptance versions, plus the 18+ confirmation. */
  async currentDocuments(): Promise<LegalDocument[]> {
    const out: LegalDocument[] = [];
    for (const def of MANAGED_DOCUMENTS.filter((d) => d.requiredForAll)) {
      const doc = await this.documents.current(def.type);
      if (!doc) continue;
      out.push({
        type: def.type as LegalDocumentType,
        version: doc.acceptanceVersion,
        edition: doc.edition,
        title: doc.title,
        statement: STATEMENTS[def.type as LegalDocumentType],
        url: def.url,
        lastUpdated: doc.publishedAt?.toISOString() ?? null,
      });
    }
    out.push({
      type: 'AGE_18_PLUS',
      version: AGE_18_PLUS_VERSION,
      edition: 'GLOBAL',
      title: 'Age confirmation',
      statement: STATEMENTS.AGE_18_PLUS,
      url: null,
    });
    return out;
  }

  /** Current documents this user has not accepted at their current version. */
  async pending(userId: string) {
    const docs = await this.currentDocuments();
    const rows = await this.prisma.legalAcceptance.findMany({
      where: {
        userId,
        OR: docs.map((d) => ({ documentType: d.type, version: d.version, edition: d.edition })),
      },
      select: { documentType: true },
    });
    const accepted = new Set(rows.map((r) => r.documentType));
    return docs.filter((d) => !accepted.has(d.type));
  }

  /**
   * Records the given acceptances. Every item must name a current document at its
   * current version, so a stale page can't record agreement to old wording.
   */
  async accept(
    userId: string,
    items: Array<{ type?: unknown; version?: unknown }>,
    ctx: AcceptanceContext,
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Nothing to accept.');
    }
    const current = await this.currentDocuments();
    const docs = items.map((item) => {
      const doc = current.find((d) => d.type === item?.type);
      if (!doc) throw new BadRequestException(`Unknown document: ${String(item?.type)}`);
      if (doc.version !== item.version) {
        throw new BadRequestException(`${doc.title} has been updated. Reload the page and review the current version.`);
      }
      return doc;
    });
    const unique = [...new Map(docs.map((d) => [d.type, d])).values()];

    await this.prisma.legalAcceptance.createMany({
      data: unique.map((d) => ({
        userId,
        documentType: d.type,
        edition: d.edition,
        version: d.version,
        statementHash: statementHash(d),
        source: ctx.source,
        ipAddress: ctx.ipAddress?.slice(0, 64) ?? null,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
      })),
    });
    return { pending: await this.pending(userId) };
  }

  /**
   * Sign-up: records the boxes ticked on the form. Never blocks registration: an
   * older app that sends nothing (or a stale version) gets the in-app gate instead.
   */
  async recordAtRegistration(
    userId: string,
    accepted: Partial<Record<LegalDocumentType, string | undefined>>,
    ctx: Omit<AcceptanceContext, 'source'>,
  ) {
    const current = await this.currentDocuments();
    const items = current
      .filter((d) => accepted[d.type] === d.version)
      .map((d) => ({ type: d.type, version: d.version }));
    if (!items.length) return;
    await this.accept(userId, items, { ...ctx, source: 'REGISTER' });
  }
}
