// apps/api/src/verification/verification.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { VerificationStatus, Role } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VerificationService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(path.join(this.uploadDir, 'verification'), { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async uploadDocuments(userId: string, files: Express.Multer.File[], dto: any) {
    const uploadPromises = files.map(async (file) => {
      const fileName = `${uuidv4()}-${file.originalname}`;
      const filePath = path.join(this.uploadDir, 'verification', fileName);

      await fs.writeFile(filePath, file.buffer);

      return this.prisma.verificationDoc.create({
        data: {
          userId,
          type: dto.documentType || 'license',
          fileUrl: `/uploads/verification/${fileName}`,
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
    return this.prisma.verificationDoc.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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

    return {
      users,
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

    return document;
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

  async verifyUser(userId: string, dto: any, reviewerId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: dto.status,
        verifiedAt: dto.status === VerificationStatus.VERIFIED ? new Date() : null,
      },
    });

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