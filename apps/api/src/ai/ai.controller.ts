// apps/api/src/ai/ai.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  Get,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseInterceptors,
  Query,
  Logger
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AiService, ResourceSuggestion } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { 
  SummarizeDto, 
  ExtractInsightsDto, 
  SuggestResourcesDto, 
  ModerateContentDto,
  SemanticSearchDto,
  GenerateTagsDto 
} from './dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('ai')
@UseGuards(ThrottlerGuard) // Apply rate limiting to all AI endpoints
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor) // Cache summaries
  async summarize(
    @Request() req: any,
    @Body(ValidationPipe) dto: SummarizeDto
  ) {
    this.logger.debug(`Summarize request from user ${req.user.id}`);
    
    const summary = await this.aiService.generatePostSummary(
      dto.content,
      req.user.id
    );
    
    return { 
      summary,
      generated: true,
      model: 'AI' 
    };
  }

  @Post('extract-insights')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async extractInsights(
    @Request() req: any,
    @Body(ValidationPipe) dto: ExtractInsightsDto
  ) {
    this.logger.debug(`Extract insights request from user ${req.user.id}`);
    
    const insights = await this.aiService.extractKeyInsights(
      dto.content,
      req.user.id
    );
    
    return { 
      insights,
      count: insights.length 
    };
  }

  @Post('suggest-resources')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor) // Cache resource suggestions
  async suggestResources(
    @Request() req: any,
    @Body(ValidationPipe) dto: SuggestResourcesDto
  ): Promise<{ resources: ResourceSuggestion[]; count: number }> {
    this.logger.debug(`Suggest resources request from user ${req.user.id}`);
    
    const resources = await this.aiService.suggestResources(
      dto.topic,
      req.user.id
    );
    
    return { 
      resources,
      count: resources.length 
    };
  }

  @Post('moderate-content')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async moderateContent(
    @Request() req: any,
    @Body(ValidationPipe) dto: ModerateContentDto
  ) {
    this.logger.debug(`Content moderation request from user ${req.user.id}`);
    
    const moderation = await this.aiService.moderateHealthContent(dto.content);
    
    return {
      ...moderation,
      timestamp: new Date().toISOString()
    };
  }

  @Post('redact-pii')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async redactPII(
    @Request() req: any,
    @Body('content') content: string
  ) {
    this.logger.debug(`PII redaction request from user ${req.user.id}`);
    
    const redacted = await this.aiService.redactSensitiveInfo(content);
    
    return { 
      original: content.length,
      redacted: redacted.length,
      content: redacted 
    };
  }

  @Post('generate-tags')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateTags(
    @Request() req: any,
    @Body(ValidationPipe) dto: GenerateTagsDto
  ) {
    this.logger.debug(`Generate tags request from user ${req.user.id}`);
    
    const tags = await this.aiService.generateSmartTags(
      dto.content,
      dto.title
    );
    
    return { 
      tags,
      count: tags.length 
    };
  }

  @Post('semantic-search')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async semanticSearch(
    @Request() req: any,
    @Body(ValidationPipe) dto: SemanticSearchDto
  ) {
    this.logger.debug(`Semantic search request from user ${req.user.id}`);
    
    const embedding = await this.aiService.generateEmbedding(dto.query);
    
    // This would normally search through your vector database
    // For now, return the embedding stats
    return {
      query: dto.query,
      embeddingGenerated: embedding.length > 0,
      dimensions: embedding.length,
      message: 'Embedding generated successfully. Implement vector search in PostsService.'
    };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return this.aiService.healthCheck();
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUsage(@Request() req: any) {
    // Get user's AI usage statistics
    const usage = await this.aiService.getUserUsageStats(req.user.id);
    return usage;
  }

  @Get('usage/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAdminUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    // Get overall AI usage statistics for admins
    const usage = await this.aiService.getOverallUsageStats(startDate, endDate);
    return usage;
  }

  @Post('suggest-tags')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async suggestTags(
    @Body() dto: { title: string; content: string }
  ) {
    // Only generate if content is substantial
    if ((dto.content?.length || 0) < 50) {
      return { 
        tags: [], 
        message: 'Add more content for tag suggestions' 
      };
    }
    
    const tags = await this.aiService.generateSmartTags(
      dto.content, 
      dto.title
    );
    
    return { 
      tags: tags.slice(0, 5), // Limit to 5 suggestions
      count: tags.length 
    };
  }
}
