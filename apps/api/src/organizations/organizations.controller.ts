import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createOrgDto: CreateOrganizationDto, @Request() req: any) {
        const userId = req.user.id;
        return this.organizationsService.create({ ...createOrgDto, userId });
    }

    @Get()
    findAll() {
        return this.organizationsService.findAll();
    }

    @Get('invitations/my')
    @UseGuards(JwtAuthGuard)
    getMyInvitations(@Request() req: any) {
        return this.organizationsService.getInvitationsForUser(req.user.email);
    }

    @Get('invitations/verify/:token')
    verifyInvitation(@Param('token') token: string) {
        return this.organizationsService.verifyInvitation(token);
    }

    @Post('invitations/accept')
    @UseGuards(JwtAuthGuard)
    acceptInvitation(@Body('token') token: string, @Request() req: any) {
        return this.organizationsService.acceptInvitation(token, req.user.id);
    }

    @Post('invitations/decline')
    @UseGuards(JwtAuthGuard)
    declineInvitation(@Body('token') token: string, @Request() req: any) {
        return this.organizationsService.declineInvitation(token, req.user.email);
    }

    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.organizationsService.findOne(slug);
    }

    @Post(':slug/join')
    // @UseGuards(JwtAuthGuard)
    join(@Param('slug') slug: string, @Request() req: any) {
        const userId = req.user?.id || 'mock-user-id';
        return this.organizationsService.join(slug, userId);
    }

    @Get(':slug/members')
    getMembers(@Param('slug') slug: string) {
        return this.organizationsService.getMembers(slug);
    }

    @Get(':slug/communities')
    getCommunities(@Param('slug') slug: string) {
        return this.organizationsService.getCommunities(slug);
    }

    @Get(':slug/invitations')
    @UseGuards(JwtAuthGuard)
    getPendingInvitations(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getPendingInvitations(slug, req.user.id);
    }

    @Put(':slug/members/:memberId')
    // @UseGuards(JwtAuthGuard)
    updateMemberStatus(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body('status') status: any,
        @Request() req: any
    ) {
        const adminId = req.user?.id || 'mock-user-id';
        return this.organizationsService.updateMemberStatus(slug, memberId, status, adminId);
    }

    @Post(':slug/members')
    @UseGuards(JwtAuthGuard)
    inviteMember(
        @Param('slug') slug: string,
        @Body() inviteDto: InviteMemberDto,
        @Request() req: any
    ) {
        const adminId = req.user.id;
        return this.organizationsService.inviteMember(slug, inviteDto.email, inviteDto.role, adminId);
    }

    /**
     * Bulk validate an uploaded Excel file for member invitations
     */
    @Post(':slug/invitations/validate-bulk')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async validateBulkInvite(
        @Param('slug') slug: string,
        @UploadedFile() file: any,
        @Request() req: any
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.organizationsService.validateBulkInviteFile(file.buffer, slug, req.user.id);
    }

    /**
     * Confirm and send bulk invitations
     */
    @Post(':slug/invitations/confirm-bulk')
    @UseGuards(JwtAuthGuard)
    async confirmBulkInvite(
        @Param('slug') slug: string,
        @Body() bulkInviteDto: { invites: { email: string; role: string }[] },
        @Request() req: any
    ) {
        return this.organizationsService.bulkInvite(slug, bulkInviteDto.invites, req.user.id);
    }

    @Patch(':slug/settings')
    @UseGuards(JwtAuthGuard)
    updateSettings(
        @Param('slug') slug: string,
        @Body() dto: UpdateOrganizationDto,
        @Request() req: any
    ) {
        return this.organizationsService.updateSettings(slug, req.user.id, dto);
    }

    @Delete('invitations/:id')
    @UseGuards(JwtAuthGuard)
    cancelInvitation(@Param('id') id: string, @Request() req: any) {
        return this.organizationsService.cancelInvitation(id, req.user.id);
    }

    /**
     * Suspend a member - can be reactivated later
     * Accessible by organization admins and platform admins
     */
    @Post(':slug/members/:memberId/suspend')
    @UseGuards(JwtAuthGuard)
    suspendMember(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body('reason') reason: string,
        @Request() req: any
    ) {
        return this.organizationsService.suspendMember(slug, memberId, req.user.id, reason);
    }

    /**
     * Deactivate a member - permanent deactivation
     * Accessible by organization admins and platform admins
     */
    @Post(':slug/members/:memberId/deactivate')
    @UseGuards(JwtAuthGuard)
    deactivateMember(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body('reason') reason: string,
        @Request() req: any
    ) {
        return this.organizationsService.deactivateMember(slug, memberId, req.user.id, reason);
    }

    /**
     * Reactivate a suspended member back to active status
     * Accessible by organization admins and platform admins
     */
    @Post(':slug/members/:memberId/reactivate')
    @UseGuards(JwtAuthGuard)
    reactivateMember(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Request() req: any
    ) {
        return this.organizationsService.reactivateMember(slug, memberId, req.user.id);
    }

    /**
     * Get member status - useful for checking if user is suspended/deactivated
     */
    @Get(':slug/members/:userId/status')
    @UseGuards(JwtAuthGuard)
    getMemberStatus(
        @Param('slug') slug: string,
        @Param('userId') userId: string
    ) {
        return this.organizationsService.findOne(slug).then(org =>
            this.organizationsService.getMemberStatus(org.id, userId)
        );
    }
}

