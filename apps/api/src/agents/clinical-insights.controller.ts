// apps/api/src/agents/clinical-insights.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Delete,
  BadRequestException,
  NotFoundException,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ClinicalInsightsService } from './clinical-insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AnalyzeAssessmentDto } from './clinical-insights.types';

@Controller('agents/clinical-insights')
export class ClinicalInsightsController {
  constructor(private readonly clinicalInsightsService: ClinicalInsightsService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  async analyzeClinicalCase(
    @Request() req: any,
    @Body('query') query: string,
  ) {
    if (!query || query.trim().length < 10) {
      throw new BadRequestException('Please provide a detailed case description');
    }

    const insights = await this.clinicalInsightsService.generateInsights(
      query,
      req.user.id,
    );

    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('analyze-assessment')
  @UseGuards(JwtAuthGuard)
  async analyzeAssessment(
    @Request() req: any,
    @Body() dto: Record<string, any>,
  ) {
    const { childId, assessmentId, context, focusAreas } = dto as AnalyzeAssessmentDto;
    if (!childId || !assessmentId) {
      throw new BadRequestException('childId and assessmentId are required');
    }

    const insights = await this.clinicalInsightsService.analyzeAssessment(
      { childId, assessmentId, context, focusAreas },
      req.user.id,
    );

    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('analyze-stream')
  @UseGuards(JwtAuthGuard)
  async analyzeStreamed(
    @Request() req: any,
    @Body('query') query: string,
    @Res() res: any,
  ) {
    if (!query || query.trim().length < 10) {
      throw new BadRequestException('Please provide a detailed case description');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      for await (const event of this.clinicalInsightsService.generateInsightsStreamed(query, req.user.id)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ step: 'error', progress: 0, message: 'Analysis failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: any) {
    const history = await this.clinicalInsightsService.getHistory(req.user.id);
    return { success: true, data: history };
  }

  @Get('history/:id')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const conversation = await this.clinicalInsightsService.getConversation(id, req.user.id);
    return { success: true, data: conversation };
  }

  @Post('action/create-plan')
  @UseGuards(JwtAuthGuard)
  async createStructuredPlan(@Request() req: any, @Body() recommendation: any) {
    try {
      const plan = await this.clinicalInsightsService.createStructuredPlan(recommendation, req.user.id);
      return { success: true, data: plan };
    } catch (error) {
      throw new BadRequestException('Failed to create plan. Please try again.');
    }
  }

  @Get('plan/:id')
  @UseGuards(JwtAuthGuard)
  async getPlan(@Param('id') id: string) {
    const plan = await this.clinicalInsightsService.getPlan(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  @Get('conversation/:id/posts')
  @UseGuards(JwtAuthGuard)
  async getRelevantPosts(@Request() req: any, @Param('id') id: string) {
    const posts = await this.clinicalInsightsService.findRelevantPosts(id, req.user.id);
    return { success: true, data: posts };
  }

  @Post('conversation/:id/follow-up')
  @UseGuards(JwtAuthGuard)
  async followUp(
    @Request() req: any,
    @Param('id') id: string,
    @Body('query') query: string,
  ) {
    if (!query || query.trim().length < 5) {
      throw new BadRequestException('Please provide a follow-up question');
    }

    const insights = await this.clinicalInsightsService.generateFollowUp(id, query, req.user.id);
    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.clinicalInsightsService.deleteConversation(id, req.user.id);
  }

  @Post('history/:id/share')
  @UseGuards(JwtAuthGuard)
  async shareInsight(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { therapistId: string; message?: string },
  ) {
    if (!body.therapistId) {
      throw new BadRequestException('therapistId is required');
    }

    const share = await this.clinicalInsightsService.shareInsight(
      id,
      req.user.id,
      body.therapistId,
      body.message,
    );
    return { success: true, data: share };
  }

  @Get('history/:id/shares')
  @UseGuards(JwtAuthGuard)
  async getInsightShares(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const shares = await this.clinicalInsightsService.getInsightShares(id, req.user.id);
    return { success: true, data: shares };
  }

  @Delete('history/:id/share/:therapistId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInsightShare(
    @Request() req: any,
    @Param('id') id: string,
    @Param('therapistId') therapistId: string,
  ) {
    await this.clinicalInsightsService.revokeInsightShare(id, req.user.id, therapistId);
  }

  @Get('conversation/:id/follow-ups')
  @UseGuards(JwtAuthGuard)
  async getFollowUps(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const followUps = await this.clinicalInsightsService.getFollowUps(id, req.user.id);
    return { success: true, data: followUps };
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async submitFeedback(
    @Request() req: any,
    @Body() body: { conversationId: string; value: number; comment?: string },
  ) {
    if (!body.conversationId || ![1, -1].includes(body.value)) {
      throw new BadRequestException('conversationId and value (1 or -1) are required');
    }

    const feedback = await this.clinicalInsightsService.submitFeedback(
      req.user.id,
      body.conversationId,
      body.value,
      body.comment,
    );

    return { success: true, data: feedback };
  }
}
