import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create or get existing conversation between two users.
   */
  async createOrGetConversation(currentUserId: string, recipientId: string) {
    // Determine who is parent and who is therapist
    const [currentUser, recipient] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, role: true },
      }),
    ]);

    if (!currentUser || !recipient) {
      throw new NotFoundException('User not found');
    }

    let parentId: string;
    let therapistId: string;

    if (currentUser.role === 'USER') {
      parentId = currentUser.id;
      therapistId = recipient.id;
    } else {
      parentId = recipient.id;
      therapistId = currentUser.id;
    }

    // Try to find existing
    const existing = await this.prisma.conversation.findUnique({
      where: { parentId_therapistId: { parentId, therapistId } },
    });

    if (existing) {
      return { conversationId: existing.id, isNew: false };
    }

    // Create new
    const conversation = await this.prisma.conversation.create({
      data: {
        parentId,
        therapistId,
        participantIds: [parentId, therapistId],
      },
    });

    return { conversationId: conversation.id, isNew: true };
  }

  /**
   * List all conversations for a user with last message and unread count.
   */
  async listConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ parentId: userId }, { therapistId: userId }],
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: {
        parent: { select: { id: true, name: true, image: true, role: true } },
        therapist: { select: { id: true, name: true, image: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    });

    // Count unread per conversation
    const unreadCounts = await Promise.all(
      conversations.map((conv) =>
        this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        }),
      ),
    );

    return conversations.map((conv, i) => {
      const otherParty =
        conv.parentId === userId ? conv.therapist : conv.parent;

      return {
        id: conv.id,
        otherParty: {
          id: otherParty.id,
          name: otherParty.name,
          avatarUrl: otherParty.image,
          role: otherParty.role,
        },
        lastMessage: conv.messages[0]
          ? {
              body: conv.messages[0].body,
              createdAt: conv.messages[0].createdAt,
              isOwn: conv.messages[0].senderId === userId,
            }
          : null,
        unreadCount: unreadCounts[i],
      };
    });
  }

  /**
   * Get paginated messages for a conversation. Verifies participant access.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 30,
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { parentId: true, therapistId: true },
    });

    if (!conv) throw new NotFoundException('Conversation not found');

    if (conv.parentId !== userId && conv.therapistId !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId: string, senderId: string, body: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { parentId: true, therapistId: true },
    });

    if (!conv) throw new NotFoundException('Conversation not found');

    if (conv.parentId !== senderId && conv.therapistId !== senderId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId,
          body,
        },
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Return recipient ID for socket notification
    const recipientId =
      conv.parentId === senderId ? conv.therapistId : conv.parentId;

    return { message, recipientId };
  }

  /**
   * Mark all unread messages in a conversation as read.
   */
  async markAsRead(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { parentId: true, therapistId: true },
    });

    if (!conv) throw new NotFoundException('Conversation not found');

    if (conv.parentId !== userId && conv.therapistId !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { markedCount: result.count };
  }
}
