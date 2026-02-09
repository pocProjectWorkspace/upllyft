// ============================================
// apps/api/src/questions/questions.controller.ts
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFiltersDto
} from './dto';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthRequest,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    console.log('📝 Creating question via controller');
    return this.questionsService.create(req.user.id, createQuestionDto);
  }

  @Get('statistics')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get question statistics' })
  async getStatistics() {
    console.log('📊 Getting question statistics via controller');
    return this.questionsService.getQuestionStats();
  }

  @Get('followed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get followed questions' })
  async getFollowed(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    console.log('👥 Getting followed questions via controller');
    return this.questionsService.getFollowedQuestions(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if following question' })
  async checkFollow(@Param('id') id: string, @Request() req: AuthRequest) {
    // This is just to check follow status
    const result = await this.questionsService.toggleFollow(id, req.user.id);
    return result;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get question by ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    console.log('🔍 Getting single question via controller:', id);
    const userId = req.user?.id;
    return this.questionsService.findOne(id, userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all questions with filters' })
  async findAll(@Query() filters: QuestionFiltersDto, @Request() req: any) {
    console.log('📋 QuestionsController.findAll called with filters:', filters);
    const userId = req.user?.id;
    console.log('👤 User ID:', userId);

    const result = await this.questionsService.findAll(filters, userId);

    console.log('✅ QuestionsController returning:', {
      questionsCount: result.questions?.length || 0,
      total: result.total,
      hasQuestions: !!result.questions,
    });

    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update question' })
  async update(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    console.log('✏️ Updating question via controller:', id);
    return this.questionsService.update(id, req.user.id, updateQuestionDto);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close question' })
  async close(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('reason') reason: string,
  ) {
    console.log('🔒 Closing question via controller:', id);
    return this.questionsService.closeQuestion(id, req.user.id, reason);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow/Unfollow question' })
  async toggleFollow(@Param('id') id: string, @Request() req: AuthRequest) {
    console.log('👥 Toggling follow via controller:', id);
    return this.questionsService.toggleFollow(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete question' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    console.log('🗑️ Deleting question via controller:', id);
    await this.questionsService.remove(id, req.user.id, req.user.role);
  }
}