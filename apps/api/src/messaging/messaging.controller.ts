import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private messagingGateway: MessagingGateway,
    private eventEmitter: EventEmitter2,
  ) {}

  @Post('conversations')
  async createOrGetConversation(
    @Req() req: any,
    @Body('recipientId') recipientId: string,
  ) {
    return this.messagingService.createOrGetConversation(req.user.id, recipientId);
  }

  @Get('conversations')
  async listConversations(@Req() req: any) {
    return this.messagingService.listConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getMessages(
      id,
      req.user.id,
      page || 1,
      limit || 30,
    );
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body('body') body: string,
  ) {
    const { message, recipientId } = await this.messagingService.sendMessage(
      id,
      req.user.id,
      body,
    );

    // Emit real-time events
    this.messagingGateway.emitNewMessage(id, message, recipientId);

    // Emit event for push notification
    this.eventEmitter.emit('message.created', {
      conversationId: id,
      senderId: req.user.id,
      senderName: message.sender?.name || 'Someone',
      recipientId,
      bodyPreview: body.length > 100 ? body.substring(0, 100) + '...' : body,
    });

    return message;
  }

  @Patch('conversations/:id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.messagingService.markAsRead(id, req.user.id);
  }
}
