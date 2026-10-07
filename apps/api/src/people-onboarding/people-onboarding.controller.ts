import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import type { Response } from 'express';
import { MAX_IMPORT_BYTES, therapistTemplate } from './import-rows';
import { OnboardingScopeService } from './onboarding-scope';
import { ParentInvitationService } from './parent-invitation.service';
import { TherapistOnboardingService } from './therapist-onboarding.service';

const upload = FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } });
const truthy = (v: unknown) => v === true || v === 'true' || v === '1';

/** The blank therapist spreadsheet, as a download. */
function templateDownload(res: Response, format: string | undefined) {
  const csv = format === 'csv';
  res.set({
    'Content-Type': csv ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="upllyft-therapists-template.${csv ? 'csv' : 'xlsx'}"`,
    'Cache-Control': 'no-store',
  });
  return new StreamableFile(therapistTemplate(csv ? 'csv' : 'xlsx'));
}

/** Platform admins: add therapists and invite families, optionally into an organisation. */
@ApiTags('onboarding')
@Controller('admin/onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOnboardingController {
  constructor(
    private readonly scope: OnboardingScopeService,
    private readonly therapists: TherapistOnboardingService,
    private readonly invites: ParentInvitationService,
  ) {}

  @Post('therapists')
  async createTherapist(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.therapists.createOne(req.user, body, await this.scope.platform(req.user, body.organizationId as string));
  }

  @Get('therapists/template')
  therapistTemplate(@Query('format') format: string | undefined, @Res({ passthrough: true }) res: Response) {
    return templateDownload(res, format);
  }

  @Post('therapists/import')
  @UseInterceptors(upload)
  async importTherapists(@Req() req: any, @UploadedFile() file: any, @Body() body: { organizationId?: string; dryRun?: string }) {
    return this.therapists.importFile(req.user, file, await this.scope.platform(req.user, body.organizationId), truthy(body.dryRun));
  }

  @Post('parent-invitations')
  async inviteParents(@Req() req: any, @Body() body: { invites?: unknown; organizationId?: string }) {
    return this.invites.inviteList(req.user, body, await this.scope.platform(req.user, body.organizationId));
  }

  @Post('parent-invitations/import')
  @UseInterceptors(upload)
  async importParents(@Req() req: any, @UploadedFile() file: any, @Body() body: { organizationId?: string; dryRun?: string }) {
    return this.invites.importFile(req.user, file, await this.scope.platform(req.user, body.organizationId), truthy(body.dryRun));
  }

  @Get('parent-invitations')
  async listParents(@Req() req: any, @Query() query: Record<string, string>) {
    return this.invites.list(await this.scope.platform(req.user, query.organizationId), query);
  }

  @Post('parent-invitations/:id/resend')
  async resend(@Req() req: any, @Param('id') id: string) {
    return this.invites.resend(req.user, id, await this.scope.platform(req.user));
  }

  @Delete('parent-invitations/:id')
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.invites.cancel(id, await this.scope.platform(req.user));
  }
}

/** Organisation admins: the same tools, scoped to their organisation. */
@ApiTags('onboarding')
@Controller('organizations/:slug/onboarding')
@UseGuards(JwtAuthGuard)
export class OrgOnboardingController {
  constructor(
    private readonly scope: OnboardingScopeService,
    private readonly therapists: TherapistOnboardingService,
    private readonly invites: ParentInvitationService,
  ) {}

  @Post('therapists')
  async createTherapist(@Req() req: any, @Param('slug') slug: string, @Body() body: Record<string, unknown>) {
    return this.therapists.createOne(req.user, body, await this.scope.organization(req.user, slug));
  }

  @Get('therapists/template')
  async therapistTemplate(
    @Req() req: any,
    @Param('slug') slug: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.scope.organization(req.user, slug);
    return templateDownload(res, format);
  }

  @Post('therapists/import')
  @UseInterceptors(upload)
  async importTherapists(@Req() req: any, @Param('slug') slug: string, @UploadedFile() file: any, @Body() body: { dryRun?: string }) {
    return this.therapists.importFile(req.user, file, await this.scope.organization(req.user, slug), truthy(body.dryRun));
  }

  @Post('parent-invitations')
  async inviteParents(@Req() req: any, @Param('slug') slug: string, @Body() body: { invites?: unknown }) {
    return this.invites.inviteList(req.user, body, await this.scope.organization(req.user, slug));
  }

  @Post('parent-invitations/import')
  @UseInterceptors(upload)
  async importParents(@Req() req: any, @Param('slug') slug: string, @UploadedFile() file: any, @Body() body: { dryRun?: string }) {
    return this.invites.importFile(req.user, file, await this.scope.organization(req.user, slug), truthy(body.dryRun));
  }

  @Get('parent-invitations')
  async listParents(@Req() req: any, @Param('slug') slug: string, @Query() query: Record<string, string>) {
    return this.invites.list(await this.scope.organization(req.user, slug), query);
  }

  @Post('parent-invitations/:id/resend')
  async resend(@Req() req: any, @Param('slug') slug: string, @Param('id') id: string) {
    return this.invites.resend(req.user, id, await this.scope.organization(req.user, slug));
  }

  @Delete('parent-invitations/:id')
  async cancel(@Req() req: any, @Param('slug') slug: string, @Param('id') id: string) {
    return this.invites.cancel(id, await this.scope.organization(req.user, slug));
  }
}

/** Public: the registration page reads an invite link. */
@ApiTags('onboarding')
@Controller('invitations/platform')
export class PublicInvitationController {
  constructor(private readonly invites: ParentInvitationService) {}

  @Get(':token')
  verify(@Param('token') token: string) {
    return this.invites.verify(token);
  }
}
