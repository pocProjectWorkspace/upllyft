import { Controller, Get, Post, Body, Param, Query, Put, Patch, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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

    // Must stay above @Get(':slug') — otherwise 'my' is captured as a slug.
    @Get('my')
    @UseGuards(JwtAuthGuard)
    findMine(@Request() req: any) {
        return this.organizationsService.findMine(req.user.id);
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

    @Get(':slug/stats')
    @UseGuards(JwtAuthGuard)
    getStats(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getStats(slug, req.user.id);
    }

    @Get(':slug/events')
    findEvents(@Param('slug') slug: string) {
        return this.organizationsService.findEvents(slug);
    }

    @Post(':slug/join')
    @UseGuards(JwtAuthGuard)
    join(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.join(slug, req.user.id);
    }

    // Returns member PII (name + email). Members only — never public.
    @Get(':slug/members')
    @UseGuards(JwtAuthGuard)
    getMembers(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getMembers(slug, req.user.id);
    }

    @Get(':slug/communities')
    getCommunities(@Param('slug') slug: string) {
        return this.organizationsService.getCommunities(slug);
    }

    @Post(':slug/communities')
    @UseGuards(JwtAuthGuard)
    createCommunity(
        @Param('slug') slug: string,
        @Body() body: any,
        @Request() req: any
    ) {
        return this.organizationsService.createCommunity(slug, body, req.user.id);
    }

    @Get(':slug/invitations')
    @UseGuards(JwtAuthGuard)
    getPendingInvitations(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getPendingInvitations(slug, req.user.id);
    }

    @Put(':slug/members/:memberId')
    @UseGuards(JwtAuthGuard)
    updateMemberStatus(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body('status') status: any,
        @Request() req: any
    ) {
        return this.organizationsService.updateMemberStatus(slug, memberId, status, req.user.id);
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
     * Leave / holidays for a member's therapist profile — the org-admin's
     * Leave Management screen. Reads/writes the SAME AvailabilityException
     * records the therapist edits from their own Hub Absence panel.
     */
    @Get(':slug/members/:memberId/leave')
    @UseGuards(JwtAuthGuard)
    getMemberLeave(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Request() req: any
    ) {
        return this.organizationsService.getMemberLeave(slug, memberId, req.user.id);
    }

    @Post(':slug/members/:memberId/leave')
    @UseGuards(JwtAuthGuard)
    addMemberLeave(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body() body: { fromDate: string; toDate?: string; reason?: string },
        @Request() req: any
    ) {
        return this.organizationsService.addMemberLeave(slug, memberId, req.user.id, body);
    }

    @Delete(':slug/members/:memberId/leave/:exceptionId')
    @UseGuards(JwtAuthGuard)
    removeMemberLeave(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Param('exceptionId') exceptionId: string,
        @Request() req: any
    ) {
        return this.organizationsService.removeMemberLeave(slug, memberId, req.user.id, exceptionId);
    }

    /** Add Therapist wizard: read a member's therapist profile for pre-fill. */
    @Get(':slug/members/:memberId/therapist-profile')
    @UseGuards(JwtAuthGuard)
    getMemberTherapistProfile(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Request() req: any
    ) {
        return this.organizationsService.getMemberTherapistProfile(slug, memberId, req.user.id);
    }

    /** Add Therapist wizard: upload a credential document. */
    @Post(':slug/members/:memberId/credentials')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    uploadMemberCredential(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @UploadedFile() file: any,
        @Body('label') label: string,
        @Request() req: any
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.organizationsService.uploadMemberCredential(slug, req.user.id, memberId, file, label);
    }

    /** Add Therapist wizard: list a member's uploaded credentials. */
    @Get(':slug/members/:memberId/credentials')
    @UseGuards(JwtAuthGuard)
    listMemberCredentials(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Request() req: any
    ) {
        return this.organizationsService.listMemberCredentials(slug, req.user.id, memberId);
    }

    /** Add Therapist wizard: save Basic Info + Credentials. */
    @Patch(':slug/members/:memberId/therapist-profile')
    @UseGuards(JwtAuthGuard)
    saveMemberTherapistProfile(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body() body: any,
        @Request() req: any
    ) {
        return this.organizationsService.saveMemberTherapistProfile(slug, memberId, req.user.id, body);
    }

    /** Add Therapist wizard, Schedule step: replace weekly availability. */
    @Put(':slug/members/:memberId/availability')
    @UseGuards(JwtAuthGuard)
    saveMemberAvailability(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body() body: { slots: { dayOfWeek: number; startTime: string; endTime: string }[]; timezone?: string },
        @Request() req: any
    ) {
        return this.organizationsService.saveMemberAvailability(slug, memberId, req.user.id, body?.slots || [], body?.timezone);
    }

    /** Add Therapist wizard, Fees step: upsert session types. */
    @Put(':slug/members/:memberId/session-types')
    @UseGuards(JwtAuthGuard)
    saveMemberSessionTypes(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body() body: { items: { name: string; duration: number; price: number; currency: string }[] },
        @Request() req: any
    ) {
        return this.organizationsService.saveMemberSessionTypes(slug, memberId, req.user.id, body?.items || []);
    }

    /**
     * Approve & Activate (approve=true, the default) or Request Changes
     * (approve=false) for a member — the Add Therapist wizard's Review step.
     */
    @Post(':slug/members/:memberId/approve')
    @UseGuards(JwtAuthGuard)
    approveMember(
        @Param('slug') slug: string,
        @Param('memberId') memberId: string,
        @Body('approve') approve: boolean | undefined,
        @Request() req: any
    ) {
        return this.organizationsService.approveMember(slug, memberId, req.user.id, approve !== false);
    }

    // ── Family Intake Journey ──

    /** Org therapists for the assign dropdown (admin). */
    @Get(':slug/therapists')
    @UseGuards(JwtAuthGuard)
    getOrgTherapists(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getOrgTherapists(slug, req.user.id);
    }

    /** Member-accessible therapist roster (therapist-side Community wizard). */
    @Get(':slug/roster')
    @UseGuards(JwtAuthGuard)
    getOrgRoster(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getOrgRoster(slug, req.user.id);
    }

    /** Families queue — every case belonging to this org. */
    @Get(':slug/families')
    @UseGuards(JwtAuthGuard)
    getOrgFamilies(@Param('slug') slug: string, @Request() req: any) {
        return this.organizationsService.getOrgFamilies(slug, req.user.id);
    }

    /** One family's full detail. */
    @Get(':slug/families/:caseId')
    @UseGuards(JwtAuthGuard)
    getOrgFamilyDetail(
        @Param('slug') slug: string,
        @Param('caseId') caseId: string,
        @Request() req: any
    ) {
        return this.organizationsService.getOrgFamilyDetail(slug, req.user.id, caseId);
    }

    /** Assign / reassign the primary therapist on a family's case. */
    @Post(':slug/families/:caseId/assign')
    @UseGuards(JwtAuthGuard)
    assignOrgFamilyTherapist(
        @Param('slug') slug: string,
        @Param('caseId') caseId: string,
        @Body('therapistId') therapistId: string,
        @Request() req: any
    ) {
        return this.organizationsService.assignOrgFamilyTherapist(slug, req.user.id, caseId, therapistId);
    }

    /** Grant the family's parent platform access (set-password email). */
    @Post(':slug/families/:caseId/grant-access')
    @UseGuards(JwtAuthGuard)
    grantOrgFamilyAccess(
        @Param('slug') slug: string,
        @Param('caseId') caseId: string,
        @Request() req: any
    ) {
        return this.organizationsService.grantOrgFamilyAccess(slug, req.user.id, caseId);
    }

    /** Issue a Parent Intake public link for a case. */
    @Post(':slug/families/:caseId/intake-link')
    @UseGuards(JwtAuthGuard)
    createIntakeLink(
        @Param('slug') slug: string,
        @Param('caseId') caseId: string,
        @Request() req: any
    ) {
        return this.organizationsService.createIntakeLink(slug, req.user.id, caseId);
    }

    /** Clinic-wide bookings calendar for a date range. */
    @Get(':slug/bookings-calendar')
    @UseGuards(JwtAuthGuard)
    getOrgBookingsCalendar(
        @Param('slug') slug: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Request() req: any
    ) {
        return this.organizationsService.getOrgBookingsCalendar(slug, req.user.id, from, to);
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

