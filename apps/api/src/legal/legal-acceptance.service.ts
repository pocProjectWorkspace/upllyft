import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LEGAL_DOCUMENTS, LegalDocument, LegalDocumentType, statementHash } from './legal-documents';

export type AcceptanceSource = 'REGISTER' | 'GATE';

export interface AcceptanceContext {
  source: AcceptanceSource;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** The public description of a document; what the sign-up form and the gate render. */
export function publicDocument(doc: LegalDocument) {
  return {
    type: doc.type,
    version: doc.version,
    edition: doc.edition,
    title: doc.title,
    statement: doc.statement,
    url: doc.url,
  };
}

/**
 * Records acceptance of the platform's legal documents (Legal Pack: "Registration
 * acceptance" table). Rows are append-only: a new version adds a row, nothing is
 * updated or removed.
 */
@Injectable()
export class LegalAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  currentDocuments() {
    return LEGAL_DOCUMENTS.map(publicDocument);
  }

  /** Current documents this user has not accepted at their current version. */
  async pending(userId: string) {
    const rows = await this.prisma.legalAcceptance.findMany({
      where: {
        userId,
        OR: LEGAL_DOCUMENTS.map((d) => ({ documentType: d.type, version: d.version, edition: d.edition })),
      },
      select: { documentType: true },
    });
    const accepted = new Set(rows.map((r) => r.documentType));
    return LEGAL_DOCUMENTS.filter((d) => !accepted.has(d.type)).map(publicDocument);
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
    const docs = items.map((item) => {
      const doc = LEGAL_DOCUMENTS.find((d) => d.type === item?.type);
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
    const items = LEGAL_DOCUMENTS.filter((d) => accepted[d.type] === d.version).map((d) => ({
      type: d.type,
      version: d.version,
    }));
    if (!items.length) return;
    await this.accept(userId, items, { ...ctx, source: 'REGISTER' });
  }
}
