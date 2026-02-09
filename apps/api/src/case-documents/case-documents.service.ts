import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CaseDocumentType } from '@prisma/client';
import {
  CreateCaseDocumentDto,
  ShareDocumentDto,
  ListDocumentsQueryDto,
} from './dto/case-documents.dto';

@Injectable()
export class CaseDocumentsService {
  constructor(private prisma: PrismaService) {}

  async createDocument(caseId: string, userId: string, dto: CreateCaseDocumentDto) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    if (!dto.content && !dto.fileUrl) {
      throw new BadRequestException('Either content or fileUrl must be provided');
    }

    const doc = await this.prisma.caseDocument.create({
      data: {
        caseId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        fileUrl: dto.fileUrl,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.auditLog(caseId, userId, 'DOCUMENT_CREATED', 'CaseDocument', doc.id);
    return doc;
  }

  async listDocuments(caseId: string, query: ListDocumentsQueryDto) {
    const limit = parseInt(query.limit || '20', 10);
    const where: Prisma.CaseDocumentWhereInput = { caseId };
    if (query.type) where.type = query.type;

    const docs = await this.prisma.caseDocument.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        shares: {
          where: { revokedAt: null },
          select: { id: true, sharedWithId: true, createdAt: true },
        },
      },
    });

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  async getDocument(caseId: string, documentId: string) {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: documentId, caseId },
      include: {
        createdBy: { select: { id: true, name: true } },
        shares: {
          where: { revokedAt: null },
          include: {
            sharedWith: { select: { id: true, name: true, email: true } },
            sharedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async shareDocument(caseId: string, userId: string, dto: ShareDocumentDto) {
    // Validate shared-with user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.sharedWithUserId },
    });
    if (!targetUser) throw new NotFoundException('User to share with not found');

    // If document specified, validate it
    if (dto.documentId) {
      const doc = await this.prisma.caseDocument.findFirst({
        where: { id: dto.documentId, caseId },
      });
      if (!doc) throw new NotFoundException('Document not found');
    }

    // Check for existing active share
    const existing = await this.prisma.caseShare.findFirst({
      where: {
        caseId,
        sharedWithId: dto.sharedWithUserId,
        documentId: dto.documentId || null,
        revokedAt: null,
      },
    });
    if (existing) throw new BadRequestException('Already shared with this user');

    const share = await this.prisma.caseShare.create({
      data: {
        caseId,
        documentId: dto.documentId,
        sharedWithId: dto.sharedWithUserId,
        sharedById: userId,
      },
      include: {
        sharedWith: { select: { id: true, name: true, email: true } },
        document: { select: { id: true, title: true, type: true } },
      },
    });

    await this.auditLog(caseId, userId, 'DOCUMENT_SHARED', 'CaseShare', share.id, {
      sharedWith: dto.sharedWithUserId,
      documentId: dto.documentId,
    });

    return share;
  }

  async revokeShare(caseId: string, shareId: string, userId: string) {
    const share = await this.prisma.caseShare.findFirst({
      where: { id: shareId, caseId, revokedAt: null },
    });
    if (!share) throw new NotFoundException('Share not found');

    await this.prisma.caseShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });

    await this.auditLog(caseId, userId, 'SHARE_REVOKED', 'CaseShare', shareId);
    return { success: true };
  }

  async getSharedItems(caseId: string) {
    return this.prisma.caseShare.findMany({
      where: { caseId, revokedAt: null },
      include: {
        sharedWith: { select: { id: true, name: true, email: true } },
        sharedBy: { select: { id: true, name: true } },
        document: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get documents shared with a specific parent (for parent portal).
   */
  async getParentSharedDocuments(parentUserId: string) {
    return this.prisma.caseShare.findMany({
      where: {
        sharedWithId: parentUserId,
        revokedAt: null,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            child: { select: { firstName: true } },
          },
        },
        document: {
          select: { id: true, title: true, type: true, fileUrl: true, createdAt: true },
        },
        sharedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async auditLog(
    caseId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ) {
    await this.prisma.caseAuditLog.create({
      data: { caseId, userId, action, entityType, entityId, changes },
    });
  }
}
