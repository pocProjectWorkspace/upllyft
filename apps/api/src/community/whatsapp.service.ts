// apps/api/src/community/whatsapp.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

@Injectable()
export class WhatsAppService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // WHATSAPP GROUP MANAGEMENT
  // ==========================================

  async createGroup(communityId: string, userId: string, data: any) {
    // Verify user is community owner/admin
    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new BadRequestException('Only community owners/admins can create WhatsApp groups');
    }

    // Count existing groups for this community
    const existingCount = await this.prisma.whatsAppGroup.count({
      where: { communityId },
    });

    // Generate QR code if group link is provided
    let qrCodeUrl: string | null = null;
    if (data.groupLink) {
      qrCodeUrl = await this.generateQRCode(data.groupLink);
    }

    const group = await this.prisma.whatsAppGroup.create({
      data: {
        communityId,
        name: data.name,
        description: data.description,
        groupLink: data.groupLink,
        qrCodeUrl,
        memberLimit: data.memberLimit || 256,
        currentCount: data.currentCount || 0,
        language: data.language || 'en',
        region: data.region,
        groupNumber: existingCount + 1,
        isOverflow: data.isOverflow || false,
        adminUserId: userId,
        adminWhatsAppNumber: data.adminWhatsAppNumber,
        autoWelcomeMessage: data.autoWelcomeMessage ?? true,
        allowMemberInvites: data.allowMemberInvites ?? true,
        moderationEnabled: data.moderationEnabled ?? true,
      },
    });

    return group;
  }

  async getGroups(communityId: string) {
    const groups = await this.prisma.whatsAppGroup.findMany({
      where: {
        communityId,
        isActive: true,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
          },
        },
      },
      orderBy: { groupNumber: 'asc' },
    });

    return groups;
  }

  async updateGroup(groupId: string, userId: string, data: any) {
    const group = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('WhatsApp group not found');
    }

    // Verify user is group admin or community owner/admin
    if (group.adminUserId !== userId) {
      const member = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: group.communityId,
          },
        },
      });

      if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
        throw new BadRequestException('Insufficient permissions');
      }
    }

    // Generate new QR code if group link changed
    let qrCodeUrl = group.qrCodeUrl;
    if (data.groupLink && data.groupLink !== group.groupLink) {
      qrCodeUrl = await this.generateQRCode(data.groupLink);
    }

    const updated = await this.prisma.whatsAppGroup.update({
      where: { id: groupId },
      data: {
        ...data,
        qrCodeUrl,
      },
    });

    return updated;
  }

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('WhatsApp group not found');
    }

    // Verify user is group admin or community owner
    if (group.adminUserId !== userId) {
      const member = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: group.communityId,
          },
        },
      });

      if (!member || member.role !== 'OWNER') {
        throw new BadRequestException('Only group admin or community owner can delete group');
      }
    }

    await this.prisma.whatsAppGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    });

    return { message: 'WhatsApp group deleted successfully' };
  }

  async syncMemberCount(groupId: string, currentCount: number) {
    const existingGroup = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup) {
      throw new NotFoundException('WhatsApp group not found');
    }

    const group = await this.prisma.whatsAppGroup.update({
      where: { id: groupId },
      data: {
        currentCount,
        isFull: currentCount >= existingGroup.memberLimit,
        lastSynced: new Date(),
      },
    });

    return group;
  }

  // ==========================================
  // INVITATIONS
  // ==========================================

  async createInvitation(groupId: string, userId: string, data: any) {
    const group = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
      include: { community: true },
    });

    if (!group) {
      throw new NotFoundException('WhatsApp group not found');
    }

    // Check if group is full
    if (group.isFull) {
      throw new BadRequestException('WhatsApp group is full');
    }

    // Check if user is member of community
    const member = await this.prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: data.targetUserId || userId,
          communityId: group.communityId,
        },
      },
    });

    if (!member) {
      throw new BadRequestException('User must be a community member first');
    }

    // Check if invitation already exists
    const existing = await this.prisma.whatsAppInvitation.findUnique({
      where: {
        whatsappGroupId_userId: {
          whatsappGroupId: groupId,
          userId: data.targetUserId || userId,
        },
      },
    });

    if (existing && existing.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('User already accepted invitation');
    }

    // Generate unique invite code
    const inviteCode = this.generateInviteCode(group.community.slug);

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.whatsAppInvitation.upsert({
      where: {
        whatsappGroupId_userId: {
          whatsappGroupId: groupId,
          userId: data.targetUserId || userId,
        },
      },
      update: {
        status: InvitationStatus.SENT,
        inviteCode,
        expiresAt,
        sentVia: data.sentVia || 'email',
        sentAt: new Date(),
      },
      create: {
        whatsappGroupId: groupId,
        userId: data.targetUserId || userId,
        inviteCode,
        status: InvitationStatus.SENT,
        expiresAt,
        sentVia: data.sentVia || 'email',
        sentAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        whatsappGroup: true,
      },
    });

    // TODO: Actually send SMS/Email here
    // await this.sendInvitationSMS(invitation);
    // await this.sendInvitationEmail(invitation);

    return invitation;
  }

  async getInvitations(groupId: string, status?: InvitationStatus) {
    const where: any = { whatsappGroupId: groupId };
    if (status) where.status = status;

    const invitations = await this.prisma.whatsAppInvitation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }

  async acceptInvitation(inviteCode: string, userId: string) {
    const invitation = await this.prisma.whatsAppInvitation.findUnique({
      where: { inviteCode },
      include: {
        whatsappGroup: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.userId !== userId) {
      throw new BadRequestException('This invitation is not for you');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation already accepted');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.whatsappGroup.isFull) {
      throw new BadRequestException('WhatsApp group is full');
    }

    // Update invitation status
    const updated = await this.prisma.whatsAppInvitation.update({
      where: { inviteCode },
      data: {
        status: InvitationStatus.ACCEPTED,
        joinedAt: new Date(),
      },
      include: {
        whatsappGroup: true,
      },
    });

    // Update community member with WhatsApp group ID
    await this.prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId,
          communityId: updated.whatsappGroup.communityId,
        },
      },
      data: {
        whatsappGroupId: updated.whatsappGroup.id,
        whatsappSynced: true,
      },
    });

    return {
      ...updated,
      message: 'Invitation accepted! Join the WhatsApp group using the link.',
    };
  }

  // Auto-create overflow group when main group is full
  async createOverflowGroup(communityId: string, mainGroupId: string) {
    const mainGroup = await this.prisma.whatsAppGroup.findUnique({
      where: { id: mainGroupId },
      include: { community: true },
    });

    if (!mainGroup) {
      throw new NotFoundException('Main group not found');
    }

    const overflowGroup = await this.prisma.whatsAppGroup.create({
      data: {
        communityId,
        name: `${mainGroup.name} - Group ${mainGroup.groupNumber + 1}`,
        description: `Overflow group for ${mainGroup.community.name}`,
        groupLink: '', // Admin needs to set this
        memberLimit: mainGroup.memberLimit,
        currentCount: 0,
        language: mainGroup.language,
        region: mainGroup.region,
        groupNumber: mainGroup.groupNumber + 1,
        isOverflow: true,
        adminUserId: mainGroup.adminUserId,
      },
    });

    return overflowGroup;
  }

  // Get user's pending invitations
  async getUserInvitations(userId: string, status?: InvitationStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    const invitations = await this.prisma.whatsAppInvitation.findMany({
      where,
      include: {
        whatsappGroup: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }

  // ==========================================
  // QR CODE GENERATION
  // ==========================================

  async generateQRCode(groupLink: string): Promise<string> {
    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(groupLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // In production, upload to S3 and return URL
      // For now, return data URL
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  async regenerateQRCode(groupId: string, userId: string) {
    const group = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('WhatsApp group not found');
    }

    if (!group.groupLink) {
      throw new BadRequestException('Group link not set');
    }

    const qrCodeUrl = await this.generateQRCode(group.groupLink);

    const updated = await this.prisma.whatsAppGroup.update({
      where: { id: groupId },
      data: { qrCodeUrl },
    });

    return updated;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private generateInviteCode(communitySlug: string): string {
    const random = randomBytes(4).toString('hex').toUpperCase();
    const prefix = communitySlug
      .split('-')
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);
    return `${prefix}-${random}`;
  }

  // Placeholder for SMS sending
  private async sendInvitationSMS(invitation: any) {
    // TODO: Integrate with SMS provider (Twilio, MSG91, Fast2SMS)
    console.log('SMS would be sent to:', invitation.user.phone);
    console.log('Message:', `Join our WhatsApp group: ${invitation.whatsappGroup.groupLink}`);
  }

  // Placeholder for Email sending
  private async sendInvitationEmail(invitation: any) {
    // TODO: Integrate with email service
    console.log('Email would be sent to:', invitation.user.email);
    console.log('Subject: You\'re invited to join our WhatsApp community');
  }

  // 🆕 NEW: Get WhatsApp group members
  async getGroupMembers(groupId: string) {
    const group = await this.prisma.whatsAppGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('WhatsApp group not found');
    }

    const members = await this.prisma.communityMember.findMany({
      where: {
        whatsappGroupId: groupId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      group: {
        id: group.id,
        name: group.name,
        currentCount: group.currentCount,
        memberLimit: group.memberLimit,
        isFull: group.isFull,
      },
      members,
      total: members.length,
    };
  }
}