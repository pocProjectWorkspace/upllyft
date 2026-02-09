// ============================================
// apps/api/src/answers/answers.controller.ts
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException     
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnswersService } from './answers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CreateAnswerDto,
  UpdateAnswerDto,
  VoteAnswerDto,
  AcceptAnswerDto,
  CreateAnswerCommentDto,
  AnswerFiltersDto,
} from './dto';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Answers')
@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new answer' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthRequest,
    @Body() createAnswerDto: CreateAnswerDto,
  ) {
    return this.answersService.create(req.user.id, createAnswerDto);
  }

  @Get('question/:questionId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get answers for a question' })
  async findByQuestion(
    @Param('questionId') questionId: string,
    @Query() filters: AnswerFiltersDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.answersService.findByQuestion(questionId, userId, filters);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update answer' })
  async update(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updateAnswerDto: UpdateAnswerDto,
  ) {
    return this.answersService.update(id, req.user.id, updateAnswerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete answer' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.answersService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on answer (helpful/not helpful)' })
  async vote(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() voteDto: VoteAnswerDto,
  ) {
    return this.answersService.voteAnswer(id, req.user.id, voteDto.value);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an answer (question author only)' })
  async accept(@Request() req: AuthRequest, @Body() acceptDto: AcceptAnswerDto) {
    // Extract questionId from answer
    const answer = await this.answersService['prisma'].answer.findUnique({
      where: { id: acceptDto.answerId },
      select: { questionId: true },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return this.answersService.acceptAnswer(
      answer.questionId,
      acceptDto.answerId,
      req.user.id,
    );
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to answer' })
  async createComment(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() commentDto: CreateAnswerCommentDto,
  ) {
    return this.answersService.createComment(id, req.user.id, commentDto);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get answer edit history' })
  async getHistory(@Param('id') id: string) {
    return this.answersService.getEditHistory(id);
  }
}