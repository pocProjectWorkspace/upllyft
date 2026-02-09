// apps/api/src/community/community.controller.ts
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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommunityService } from './community.service';
import { ApiOperation } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { CreateCommunityDto, UpdateCommunityDto } from './dto/community.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly whatsappService: WhatsAppService,
  ) { }

  // ==========================================
  // EXISTING ENDPOINTS (KEEP AS-IS)
  // ==========================================

  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get community by slug' })
  async getCommunityBySlug(@Param('slug') slug: string, @Request() req) {
    const userId = req.user?.id || null;
    return this.communityService.getCommunityBySlug(slug, userId);
  }

  @Get('stats')
  async getStats() {
    return this.communityService.getCommunityStats();
  }

  @Get('members')
  async getMembers(@Query() query: any) {
    return this.communityService.getMembers(query);
  }

  @Get('top-contributors')
  async getTopContributors(@Query('limit') limit?: string) {
    const contributorLimit = limit ? parseInt(limit) : 10;
    return this.communityService.getTopContributors(contributorLimit);
  }

  // ==========================================
  // NEW ENDPOINTS - COMMUNITY CRUD
  // ==========================================

  // @Post('create')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.CREATED)
  // async create(@Request() req: AuthRequest, @Body() dto: CreateCommunityDto) {
  //   return this.communityService.createCommunity(req.user.id, dto);
  // }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createCommunityDto: CreateCommunityDto,
    @Request() req: any,
  ) {
    // req.user comes from JwtAuthGuard
    return this.communityService.createCommunity(req.user.id, createCommunityDto);
  }

  @Get('browse')
  @UseGuards(OptionalJwtAuthGuard)
  async browse(@Query() query: any, @Request() req: any) {
    const userId = req.user?.id;
    return this.communityService.findAllCommunities(query, userId);
  }

  @Get('my-communities')
  @UseGuards(JwtAuthGuard)
  async getMyCommunities(@Request() req: AuthRequest) {
    return this.communityService.getUserCommunities(req.user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.communityService.findOneCommunity(id, userId);
  }

  @Get(':id/children')
  @UseGuards(OptionalJwtAuthGuard)
  async getSubCommunities(@Param('id') id: string) {
    return this.communityService.findAllCommunities({ parentId: id });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communityService.updateCommunity(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.communityService.deleteCommunity(id, req.user.id);
  }

  // ==========================================
  // MEMBERSHIP MANAGEMENT
  // ==========================================

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async join(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.communityService.joinCommunity(id, req.user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leave(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.communityService.leaveCommunity(id, req.user.id);
  }

  @Get(':id/community-members')
  @UseGuards(OptionalJwtAuthGuard)
  async getCommunityMembers(@Param('id') id: string, @Query() query: any) {
    return this.communityService.getCommunityMembers(id, query);
  }

  @Get(':id/pending')
  @UseGuards(JwtAuthGuard)
  async getPending(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.communityService.getPendingMembers(id, req.user.id);
  }

  @Post(':id/members/:userId/approve')
  @UseGuards(JwtAuthGuard)
  async approveMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthRequest,
  ) {
    return this.communityService.approveMember(id, userId, req.user.id);
  }

  // 🆕 NEW: Reject member endpoint
  @Post(':id/members/:userId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthRequest,
  ) {
    return this.communityService.rejectMember(id, userId, req.user.id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(JwtAuthGuard)
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: any },
    @Request() req: AuthRequest,
  ) {
    return this.communityService.updateMemberRole(id, userId, body.role, req.user.id);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthRequest,
  ) {
    return this.communityService.removeMember(id, userId, req.user.id);
  }

  // 🆕 NEW: Invite user to community
  @Post(':id/invite')
  @UseGuards(JwtAuthGuard)
  async inviteUser(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() body: { userId: string; message?: string },
  ) {
    return this.communityService.inviteUser(id, req.user.id, body.userId, body.message);
  }

  // ==========================================
  // COMMUNITY FEED
  // ==========================================

  @Get(':id/posts')
  @UseGuards(OptionalJwtAuthGuard)
  async getCommunityPosts(@Param('id') id: string, @Query() query: any) {
    return this.communityService.getCommunityPosts(id, query);
  }

  // 🆕 NEW: Personalized community feed
  @Get(':id/feed')
  @UseGuards(JwtAuthGuard)
  async getPersonalizedFeed(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Query() query: any,
  ) {
    return this.communityService.getPersonalizedFeed(id, req.user.id, query);
  }

  // ==========================================
  // WHATSAPP INTEGRATION
  // ==========================================

  @Get(':id/whatsapp-groups')
  @UseGuards(OptionalJwtAuthGuard)
  async getWhatsAppGroups(@Param('id') id: string) {
    return this.communityService.getWhatsAppGroups(id);
  }

  @Post(':id/whatsapp/create-group')
  @UseGuards(JwtAuthGuard)
  async createWhatsAppGroup(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: any
  ) {
    return this.communityService.createWhatsAppGroup(id, req.user.id, dto);
  }

  @Post(':id/whatsapp')
  @UseGuards(JwtAuthGuard)
  async createWhatsAppGroupOld(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() body: any,
  ) {
    return this.whatsappService.createGroup(id, req.user.id, body);
  }

  @Patch('whatsapp/:groupId')
  @UseGuards(JwtAuthGuard)
  async updateWhatsAppGroup(
    @Param('groupId') groupId: string,
    @Request() req: AuthRequest,
    @Body() body: any,
  ) {
    return this.whatsappService.updateGroup(groupId, req.user.id, body);
  }

  @Delete('whatsapp/:groupId')
  @UseGuards(JwtAuthGuard)
  async deleteWhatsAppGroup(
    @Param('groupId') groupId: string,
    @Request() req: AuthRequest,
  ) {
    return this.whatsappService.deleteGroup(groupId, req.user.id);
  }

  // 🆕 NEW: Get WhatsApp group members
  @Get('whatsapp/:groupId/members')
  @UseGuards(JwtAuthGuard)
  async getWhatsAppGroupMembers(@Param('groupId') groupId: string) {
    return this.whatsappService.getGroupMembers(groupId);
  }

  @Post('whatsapp/:groupId/sync')
  @UseGuards(JwtAuthGuard)
  async syncGroupMembers(
    @Param('groupId') groupId: string,
    @Body() body: { currentCount: number },
  ) {
    return this.whatsappService.syncMemberCount(groupId, body.currentCount);
  }

  @Post('whatsapp/:groupId/qr-code')
  @UseGuards(JwtAuthGuard)
  async regenerateQRCode(
    @Param('groupId') groupId: string,
    @Request() req: AuthRequest,
  ) {
    return this.whatsappService.regenerateQRCode(groupId, req.user.id);
  }

  // ==========================================
  // WHATSAPP INVITATIONS
  // ==========================================

  @Post('whatsapp/:groupId/invite')
  @UseGuards(JwtAuthGuard)
  async createInvitation(
    @Param('groupId') groupId: string,
    @Request() req: AuthRequest,
    @Body() body: any,
  ) {
    return this.whatsappService.createInvitation(groupId, req.user.id, body);
  }

  @Get('whatsapp/:groupId/invitations')
  @UseGuards(JwtAuthGuard)
  async getInvitations(
    @Param('groupId') groupId: string,
    @Query('status') status?: any,
  ) {
    return this.whatsappService.getInvitations(groupId, status);
  }

  @Post('whatsapp/invite/:code/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(@Param('code') code: string, @Request() req: AuthRequest) {
    return this.whatsappService.acceptInvitation(code, req.user.id);
  }

  @Get('whatsapp/my-invitations')
  @UseGuards(JwtAuthGuard)
  async getMyInvitations(@Request() req: AuthRequest, @Query('status') status?: any) {
    return this.whatsappService.getUserInvitations(req.user.id, status);
  }
}

