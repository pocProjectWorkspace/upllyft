import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: 'messaging',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Messaging Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub || payload.id;
      client.data.userId = userId;

      // Join user room
      client.join(`user:${userId}`);

      // Join all conversation rooms
      const conversations = await this.prisma.conversation.findMany({
        where: {
          OR: [{ parentId: userId }, { therapistId: userId }],
        },
        select: { id: true },
      });

      for (const conv of conversations) {
        client.join(`conversation:${conv.id}`);
      }

      this.logger.log(
        `Client ${client.id} connected for user ${userId}, joined ${conversations.length} conversations`,
      );

      client.emit('connected', { userId });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
  }

  /**
   * Called by the controller after persisting a message.
   */
  emitNewMessage(
    conversationId: string,
    message: any,
    recipientId: string,
  ) {
    // Emit to conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);

    // Emit conversation update to both participants for unread refresh
    this.server
      .to(`user:${message.sender.id}`)
      .emit('conversations:updated', { conversationId });
    this.server
      .to(`user:${recipientId}`)
      .emit('conversations:updated', { conversationId });
  }
}
