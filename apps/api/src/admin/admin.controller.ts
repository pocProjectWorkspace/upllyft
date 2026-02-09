// apps/api/src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  @Get('stats/communities')
  async getCommunityStats() {
    return this.adminService.getCommunityStats();
  }

  @Get('stats/organizations')
  async getOrganizationStats() {
    return this.adminService.getOrganizationStats();
  }

  @Get('stats/engagement')
  async getEngagementStats() {
    return this.adminService.getEngagementStats();
  }

  @Get('stats/content-moderation')
  async getContentModerationStats() {
    return this.adminService.getContentModerationStats();
  }

  @Get('stats/user-growth')
  async getUserGrowthStats() {
    return this.adminService.getUserGrowthStats();
  }

  @Get('stats/system-health')
  async getSystemHealthStats() {
    return this.adminService.getSystemHealthStats();
  }

  @Get('stats/feature-usage')
  async getFeatureUsageStats() {
    return this.adminService.getFeatureUsageStats();
  }

  @Get('charts/engagement-trends')
  async getEngagementTrends() {
    return this.adminService.getEngagementTrends();
  }

  @Get('charts/user-distribution')
  async getUserDistribution() {
    return this.adminService.getUserDistribution();
  }

  @Get('analytics')
  async getAnalytics(@Query('range') range?: string) {
    return this.adminService.getAnalytics(range);
  }

  @Get('users')
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/role')
  @Roles(Role.ADMIN) // Only admins can change roles
  async updateUserRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/ban')
  @Roles(Role.ADMIN) // Only admins can ban users
  async banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }

  @Get('moderation/flagged')
  async getFlaggedContent(@Query() query: any) {
    return this.adminService.getFlaggedContent(query);
  }

  @Patch('moderation/:id')
  @HttpCode(HttpStatus.OK)
  async moderateContent(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'remove'; notes?: string },
  ) {
    return this.adminService.moderateContent(id, body.action, body.notes);
  }
}