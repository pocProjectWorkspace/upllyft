// apps/api/src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  // ── Therapist Credentials ───────────────────────────────────

  @Post('therapists/:id/credentials')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only PDF, JPEG, and PNG are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadCredential(
    @Param('id') therapistId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { label: string; expiresAt?: string },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!body.label) {
      throw new BadRequestException('Label is required');
    }
    return this.adminService.uploadCredential(
      therapistId,
      req.user.id,
      file,
      body.label,
      body.expiresAt,
    );
  }

  @Get('therapists/:id/credentials')
  async getTherapistCredentials(@Param('id') therapistId: string) {
    return this.adminService.getTherapistCredentials(therapistId);
  }

  @Get('therapists/:id/credentials/:credId/download')
  async getCredentialDownloadUrl(
    @Param('id') therapistId: string,
    @Param('credId') credId: string,
  ) {
    return this.adminService.getCredentialDownloadUrl(therapistId, credId);
  }

  @Delete('therapists/:id/credentials/:credId')
  @Roles(Role.ADMIN)
  async deleteCredential(
    @Param('id') therapistId: string,
    @Param('credId') credId: string,
  ) {
    return this.adminService.deleteCredential(therapistId, credId);
  }

  // ── PDPL: Right to Access ─────────────────────────────────────

  @Get('users/:id/data-export')
  @Roles(Role.ADMIN)
  async exportUserData(@Param('id') userId: string, @Req() req: any) {
    return this.adminService.exportUserData(userId, req.user.id);
  }

  // ── PDPL: Right to Deletion ───────────────────────────────────

  @Delete('users/:id/data')
  @Roles(Role.ADMIN)
  async deleteUserData(@Param('id') userId: string, @Req() req: any) {
    return this.adminService.deleteUserData(userId, req.user.id);
  }

  // ── Platform Admin: Clinics ───────────────────────────────────

  @Get('clinics')
  @Roles(Role.ADMIN)
  async getAllClinics() {
    return this.adminService.getAllClinics();
  }

  @Post('clinics')
  @Roles(Role.ADMIN)
  async createPlatformClinic(@Body() body: any) {
    return this.adminService.createPlatformClinic(body);
  }
}