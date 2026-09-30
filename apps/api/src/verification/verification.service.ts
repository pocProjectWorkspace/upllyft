// apps/api/src/verification/verification.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { syncPracticeCompliance } from '../common/clinic-admin';
import { CareWaitlistService } from '../care-waitlist/care-waitlist.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { VerificationStatus, Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../common/storage/storage.service';
import { detectContentType } from '../common/storage/file-type';

/** Private bucket shared with organisation credentials. */
const VERIFICATION_BUCKET = 'credentials';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const DOCUMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private storage: StorageService,
    private careWaitlist: CareWaitlistService,
  ) {}

  /**
   * Documents live in a private bucket; `fileUrl` holds the storage path.
   * Replace it with a short-lived signed URL before returning to clients.
   * Legacy rows that still point at `/uploads/...` are returned unchanged.
   */
  private async withSignedUrls<T extends { fileUrl: string }>(docs: T[]): Promise<T[]> {
    return Promise.all(
      docs.map(async (doc) => {
        if (!StorageService.isStoragePath(doc.fileUrl)) return doc;
        const signed = await this.storage.signedUrl(VERIFICATION_BUCKET, doc.fileUrl, SIGNED_URL_TTL_SECONDS);
        return signed ? { ...doc, fileUrl: signed } : doc;
      }),
    );
  }

  async uploadDocuments(userId: string, files: Express.Multer.File[], dto: any) {
    const uploadPromises = files.map(async (file) => {
      const safeName = file.originalname.replace(/[^\w.-]+/g, '_');
      // Content-type is derived from the bytes, never from the client.
      const contentType = detectContentType(file.buffer, file.originalname, file.mimetype, DOCUMENT_MIMES);
      const objectPath = await this.storage.uploadPrivate(
        VERIFICATION_BUCKET,
        `verification/${userId}/${uuidv4()}-${safeName}`,
        file.buffer,
        contentType,
      );

      return this.prisma.verificationDoc.create({
        data: {
          userId,
          type: dto.documentType || 'license',
          fileUrl: objectPath,
          status: VerificationStatus.PENDING,
        },
      });
    });

    const documents = await Promise.all(uploadPromises);

    // Update user verification status to pending if not already verified
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        licenseNumber: dto.licenseNumber,
      },
    });

    // Notify admins about new verification request
    await this.notificationService.notifyAdmins({
      type: 'VERIFICATION_REQUEST',
      message: 'New verification documents uploaded',
      userId,
    });

    return {
      documents,
      message: 'Documents uploaded successfully. Verification pending.',
    };
  }

  async getUserDocuments(userId: string) {
    const docs = await this.prisma.verificationDoc.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return this.withSignedUrls(docs);
  }

  async getUserVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        verificationStatus: true,
        verifiedAt: true,
        verificationDocs: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            reviewNotes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getVerificationQueue(query: any) {
    const { page = 1, limit = 10, status = VerificationStatus.PENDING } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          verificationStatus: status,
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
        include: {
          verificationDocs: {
            where: { status },
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({
        where: {
          verificationStatus: status,
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
    ]);

    const usersWithUrls = await Promise.all(
      users.map(async (u) => ({ ...u, verificationDocs: await this.withSignedUrls(u.verificationDocs) })),
    );

    return {
      users: usersWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDocument(id: string) {
    const document = await this.prisma.verificationDoc.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            organization: true,
            specialization: true,
            yearsOfExperience: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const [signed] = await this.withSignedUrls([document]);
    return signed;
  }

  async updateDocumentStatus(id: string, dto: any, reviewerId: string) {
    const document = await this.prisma.verificationDoc.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNotes: dto.notes,
        reviewedBy: reviewerId,
      },
      include: { user: true },
    });

    // Check if all documents are verified for the user
    const allDocs = await this.prisma.verificationDoc.findMany({
      where: { userId: document.userId },
    });

    const allVerified = allDocs.every(doc => doc.status === VerificationStatus.VERIFIED);
    const anyRejected = allDocs.some(doc => doc.status === VerificationStatus.REJECTED);

    let userStatus: VerificationStatus = VerificationStatus.PENDING;
    if (allVerified && allDocs.length > 0) {
      userStatus = VerificationStatus.VERIFIED;
    } else if (anyRejected) {
      userStatus = VerificationStatus.REJECTED;
    }

    // Update user verification status
    await this.prisma.user.update({
      where: { id: document.userId },
      data: {
        verificationStatus: userStatus,
        verifiedAt: userStatus === VerificationStatus.VERIFIED ? new Date() : null,
      },
    });

    // A therapist's own practice is only as compliant as their verified licence.
    await syncPracticeCompliance(this.prisma, document.userId, userStatus);
    await this.announceIfNewlyVerified(document.user, userStatus);

    // Send notification to user
    await this.notificationService.createNotification({
      userId: document.userId,
      type: NotificationType.VERIFICATION_UPDATE,
      title: 'Verification Status Updated',
      message: `Your verification document has been ${dto.status.toLowerCase()}.`,
      actionUrl: `/settings/verification`,
      priority: 'high',
    });

    return document;
  }

  /**
   * A therapist who has just become VERIFIED is now visible to families: tell
   * anyone on the care waitlist in their country (backlog #1). Only on the
   * transition, so re-saving a verified therapist does not re-announce them.
   */
  private async announceIfNewlyVerified(
    before: { role: string; verificationStatus: VerificationStatus; country: string | null; name: string | null } | null,
    next: VerificationStatus,
  ) {
    if (!before || before.role !== 'THERAPIST') return;
    if (next !== VerificationStatus.VERIFIED || before.verificationStatus === VerificationStatus.VERIFIED) return;
    await this.careWaitlist.notifyProviderJoined({
      country: before.country,
      kind: 'therapist',
      name: before.name || 'A new therapist',
    });
  }

  async verifyUser(userId: string, dto: any, reviewerId: string) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, verificationStatus: true, country: true, name: true },
    });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: dto.status,
        verifiedAt: dto.status === VerificationStatus.VERIFIED ? new Date() : null,
      },
    });

    await syncPracticeCompliance(this.prisma, userId, dto.status);
    await this.announceIfNewlyVerified(before, dto.status);

    // Update all pending documents
    await this.prisma.verificationDoc.updateMany({
      where: {
        userId,
        status: VerificationStatus.PENDING,
      },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewNotes: dto.notes,
      },
    });

    // Send notification
    await this.notificationService.createNotification({
      userId,
      type: NotificationType.VERIFICATION_UPDATE,
      title: 'Verification Complete',
      message: `Your account has been ${dto.status.toLowerCase()}.`,
      actionUrl: `/profile/${userId}`,
      priority: 'high',
    });

    return user;
  }

  async getVerificationStatistics() {
    const [pending, verified, rejected, total] = await Promise.all([
      this.prisma.user.count({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
      this.prisma.user.count({
        where: {
          verificationStatus: VerificationStatus.VERIFIED,
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
      this.prisma.user.count({
        where: {
          verificationStatus: VerificationStatus.REJECTED,
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
      this.prisma.user.count({
        where: {
          role: { in: [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION] },
        },
      }),
    ]);

    const recentActivity = await this.prisma.verificationDoc.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return {
      stats: {
        pending,
        verified,
        rejected,
        total,
        verificationRate: total > 0 ? (verified / total * 100).toFixed(1) : 0,
      },
      recentActivity,
    };
  }
}