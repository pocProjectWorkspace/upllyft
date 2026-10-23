import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { LegalAcceptanceService } from './legal-acceptance.service';
import { LegalDocumentsService } from './legal-documents.service';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(
    private readonly legal: LegalAcceptanceService,
    private readonly documents: LegalDocumentsService,
  ) {}

  /** Public: the current documents and checkbox wording (sign-up form). */
  @Get('documents')
  async list() {
    return { documents: await this.legal.currentDocuments() };
  }

  /** Public: the current text of one document (terms, privacy, clinic-agreement, therapist-agreement). */
  @Get('documents/:slug')
  document(@Param('slug') slug: string, @Query('edition') edition?: string) {
    return this.documents.currentBySlug(slug, edition);
  }

  /** Public: the published history of a document. */
  @Get('documents/:slug/versions')
  history(@Param('slug') slug: string, @Query('edition') edition?: string) {
    return this.documents.history(slug, edition);
  }

  /** Public: one past version, e.g. the one a user accepted. */
  @Get('documents/:slug/versions/:version')
  version(@Param('slug') slug: string, @Param('version') version: string, @Query('edition') edition?: string) {
    return this.documents.version(slug, version, edition);
  }

  /** What the signed-in user still has to accept. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: any) {
    return { pending: await this.legal.pending(req.user.id) };
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  accept(@Req() req: Request & { user: { id: string } }, @Body() body: { accepted?: unknown }) {
    return this.legal.accept(req.user.id, body?.accepted as Array<{ type?: unknown; version?: unknown }>, {
      source: 'GATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}

/**
 * Platform console: edit and publish legal documents. Admins draft; only a super admin
 * publishes (RolesGuard lets SUPERADMIN through every @Roles, so ADMIN-only routes are
 * open to both and the publish route is SUPERADMIN-only).
 */
@ApiTags('legal')
@Controller('admin/legal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLegalController {
  constructor(private readonly documents: LegalDocumentsService) {}

  @Get()
  overview() {
    return this.documents.overview();
  }

  @Get(':type/history')
  history(@Param('type') type: string, @Query('edition') edition?: string) {
    return this.documents.adminHistory(type, edition);
  }

  @Get('versions/:id')
  get(@Param('id') id: string) {
    return this.documents.get(id);
  }

  @Post(':type/drafts')
  startDraft(@Req() req: any, @Param('type') type: string, @Body() body: { edition?: string }) {
    return this.documents.startDraft(req.user.id, type, body?.edition);
  }

  @Patch('versions/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { title?: unknown; content?: unknown; changeSummary?: unknown }) {
    return this.documents.updateDraft(req.user.id, id, body ?? {});
  }

  @Delete('versions/:id')
  discard(@Req() req: any, @Param('id') id: string) {
    return this.documents.discardDraft(req.user.id, id);
  }

  @Post('versions/:id/publish')
  @Roles(Role.SUPERADMIN)
  publish(@Req() req: any, @Param('id') id: string, @Body() body: { requireAcceptance?: unknown; changeSummary?: unknown }) {
    return this.documents.publish(req.user.id, id, body ?? {});
  }
}
