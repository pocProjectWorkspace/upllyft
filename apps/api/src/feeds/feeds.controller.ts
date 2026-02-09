// apps/api/src/feeds/feeds.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedsService } from './feeds.service';
import { UserPreferencesService } from './user-preferences.service';

@Controller('feeds')
@UseGuards(JwtAuthGuard)
export class FeedsController {
  constructor(
    private feedsService: FeedsService,
    private preferencesService: UserPreferencesService,
  ) {}

  @Get('personalized')
  async getPersonalizedFeed(
    @Request() req,
    @Query() query: {
      page?: string;
      limit?: string;
      view?: string;
    }
  ) {
    return this.feedsService.getPersonalizedFeed(
      req.user.id,
      {
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        view: query.view || 'FOR_YOU',
      }
    );
  }

  @Get('filtered')
  async getFilteredFeed(
    @Request() req,
    @Query() filters: any
  ) {
    return this.feedsService.getFilteredFeed(req.user.id, filters);
  }

  @Post('preferences')
  async updatePreferences(
    @Request() req,
    @Body() preferences: any
  ) {
    return this.preferencesService.updatePreferences(
      req.user.id,
      preferences
    );
  }

  @Post('interaction')
  async trackInteraction(
    @Request() req,
    @Body() interaction: {
      postId: string;
      action: string;
      duration?: number;
      scrollDepth?: number;
    }
  ) {
    return this.feedsService.trackInteraction(
      req.user.id,
      interaction
    );
  }

  @Get('views')
  async getAvailableViews(@Request() req) {
    return this.feedsService.getAvailableViews(req.user.id);
  }

  @Get('preferences')
async getPreferences(@Request() req) {
  return this.preferencesService.getPreferences(req.user.id);
}

}