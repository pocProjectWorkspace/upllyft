// apps/api/src/notification/notification.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  private userSocketMap = new Map<string, string[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) { }

  afterInit(server: Server) {
    this.notificationService.setSocketServer(server);
    this.logger.log('Notification Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query params or auth header
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub || payload.id;
      client.data.userId = userId;

      // Add to user-socket mapping
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, [client.id]);
      } else {
        const sockets = this.userSocketMap.get(userId);
        if (sockets) {
          sockets.push(client.id);
        }
      }

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} for user: ${userId}`);

      // Send connection success
      client.emit('connected', { userId });
    } catch (error) {
      // Handle expired tokens gracefully - this is expected behavior, not an error
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        this.logger.warn(`Client ${client.id} attempted connection with expired token`);
        client.emit('token_expired', { message: 'Your session has expired. Please log in again.' });
      } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
        this.logger.warn(`Client ${client.id} attempted connection with invalid token`);
        client.emit('auth_error', { message: 'Invalid authentication token.' });
      } else {
        this.logger.error('Unexpected connection error:', error);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSocketMap.has(userId)) {
      const sockets = this.userSocketMap.get(userId);
      if (!sockets) {
        // If sockets is unexpectedly undefined, ensure we don't operate on it and clean up
        this.userSocketMap.delete(userId);
      } else {
        const index = sockets.indexOf(client.id);

        if (index > -1) {
          sockets.splice(index, 1);
        }

        if (sockets.length === 0) {
          this.userSocketMap.delete(userId);
        }
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    // Emit to all user's connected clients
    this.server.to(`user:${userId}`).emit('notificationRead', {
      notificationId: data.notificationId,
    });
  }

  /**
   * Handle notification sent event
   */
  @OnEvent('notification.sent')
  handleNotificationSent(payload: { userId: string; notification: any }) {
    // Send to all connected clients of this user
    this.server.to(`user:${payload.userId}`).emit('newNotification', payload.notification);

    // Update notification count
    this.server.to(`user:${payload.userId}`).emit('notificationCount', {
      action: 'increment',
    });
  }

  /**
   * Handle notification read event
   */
  @OnEvent('notification.read')
  handleNotificationRead(payload: { userId: string; notificationId: string }) {
    this.server.to(`user:${payload.userId}`).emit('notificationRead', {
      notificationId: payload.notificationId,
    });

    // Update notification count
    this.server.to(`user:${payload.userId}`).emit('notificationCount', {
      action: 'decrement',
    });
  }

  /**
   * Handle all notifications read event
   */
  @OnEvent('notifications.allRead')
  handleAllNotificationsRead(payload: { userId: string }) {
    this.server.to(`user:${payload.userId}`).emit('allNotificationsRead');

    // Reset notification count
    this.server.to(`user:${payload.userId}`).emit('notificationCount', {
      action: 'reset',
    });
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}