// apps/api/src/comments/comments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() createCommentDto: CreateCommentDto) {
  console.log('=== Comment Creation Debug ===');
  console.log('Raw body:', req.body);
  console.log('Parsed DTO:', createCommentDto);
  console.log('PostId:', createCommentDto.postId);
  console.log('PostId type:', typeof createCommentDto.postId);
  console.log('User:', req.user);

    // Validate the DTO manually for debugging
    if (!createCommentDto.postId) {
      throw new BadRequestException('PostId is required');
    }

    return this.commentsService.create(req.user.id, createCommentDto);
  }

  @Get('post/:postId')
  @UseGuards(OptionalJwtAuthGuard)
  async findAllByPost(
    @Param('postId') postId: string,
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const userId = req.user?.id;
    return this.commentsService.findAllByPost(
      postId,
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('thread/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getThread(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.commentsService.getCommentThread(id, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, req.user.id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.commentsService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async report(
    @Param('id') id: string,
    @Request() req: any,
    @Body() reportDto: ReportCommentDto,
  ) {
    await this.commentsService.reportComment(
      id,
      req.user.id,
      reportDto.reason,
      reportDto.details,
    );
    return { message: 'Comment reported successfully' };
  }
}