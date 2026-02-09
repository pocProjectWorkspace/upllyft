// apps/api/src/notification/notification.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService, NotificationType } from './notification.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('types') types?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      unreadOnly: unreadOnly === 'true',
      types: types ? types.split(',') as NotificationType[] : undefined,
    };

    return this.notificationService.getNotifications(req.user.id, options);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    try {
      await this.notificationService.markAsRead(id, req.user.id);
      return { success: true };
    } catch (error) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Param('id') id: string, @Request() req) {
    try {
      await this.notificationService.deleteNotification(id, req.user.id);
      return { success: true };
    } catch (error) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification(@Request() req) {
    await this.notificationService.createNotification({
      userId: req.user.id,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Test Notification',
      message: 'This is a test notification from the system.',
      priority: 'medium',
    });
    return { success: true, message: 'Test notification sent' };
  }
}