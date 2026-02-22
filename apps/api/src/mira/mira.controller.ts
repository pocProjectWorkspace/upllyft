import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  Res,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { MiraService } from './mira.service';
import type { ChatDto, ScribeDto } from './mira.types';

@Controller('mira')
@UseGuards(JwtAuthGuard)
export class MiraController {
  constructor(private readonly miraService: MiraService) {}

  @Post('chat')
  async chat(
    @Request() req: any,
    @Body() body: ChatDto,
  ) {
    if (!body.message || body.message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    const result = await this.miraService.chat(
      req.user.id,
      body.message.trim(),
      body.conversationId,
      body.childId,
    );

    return { success: true, data: result };
  }

  @Post('chat-stream')
  @UseGuards(JwtAuthGuard)
  async chatStream(
    @Request() req: any,
    @Body() body: ChatDto,
    @Res() res: any,
  ) {
    if (!body.message || body.message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      for await (const event of this.miraService.chatStream(
        req.user.id,
        body.message.trim(),
        body.conversationId,
        body.childId,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: 'Something went wrong' } })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('scribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.ADMIN)
  async scribe(
    @Request() req: any,
    @Body() body: ScribeDto,
  ) {
    if (!body.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    const draft = await this.miraService.scribe(body.sessionId, req.user.id);
    return { success: true, data: draft };
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    const conversations = await this.miraService.getConversations(req.user.id);
    return { success: true, data: conversations };
  }

  @Get('conversations/:id')
  async getConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const conversation = await this.miraService.getConversation(id, req.user.id);
    return { success: true, data: conversation };
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.miraService.deleteConversation(id, req.user.id);
  }
}
