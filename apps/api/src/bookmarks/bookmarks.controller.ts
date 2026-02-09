// apps/api/src/bookmarks/bookmarks.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarksFilterDto } from './dto/bookmarks-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() createBookmarkDto: CreateBookmarkDto) {
    return this.bookmarksService.create(req.user.id, createBookmarkDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any, @Query() filterDto: BookmarksFilterDto) {
    return this.bookmarksService.findAll(req.user.id, filterDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getUserStats(@Request() req: any) {
    return this.bookmarksService.getUserBookmarkStats(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.bookmarksService.findOne(id, req.user.id);
  }

  @Delete('post/:postId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('postId') postId: string, @Request() req: any) {
    await this.bookmarksService.remove(postId, req.user.id);
  }

  @Post('toggle/:postId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggle(@Param('postId') postId: string, @Request() req: any) {
    return this.bookmarksService.toggleBookmark(req.user.id, postId, 'post');
  }

  @Post('toggle-question/:questionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleQuestion(@Param('questionId') questionId: string, @Request() req: any) {
    return this.bookmarksService.toggleBookmark(req.user.id, questionId, 'question');
  }

  @Get('check/:postId')
  @UseGuards(JwtAuthGuard)
  async checkBookmark(@Param('postId') postId: string, @Request() req: any) {
    const isBookmarked = await this.bookmarksService.checkStatus(req.user.id, postId);
    return { isBookmarked };
  }
}
