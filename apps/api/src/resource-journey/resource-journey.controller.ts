import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JourneyAccessService } from './journey-access.service';
import { JourneyLibraryService } from './journey-library.service';
import type { LibraryQuery } from './journey-library.service';
import { ResourceJourneyService } from './resource-journey.service';

/**
 * The Resources journey. Parent routes are scoped to a child the caller is guardian of
 * (JourneyAccessService.assertGuardian); therapist routes to children they work with or
 * shares granted to them.
 */
@ApiTags('resource-journey')
@Controller('resource-journey')
@UseGuards(JwtAuthGuard)
export class ResourceJourneyController {
  constructor(
    private readonly journey: ResourceJourneyService,
    private readonly library: JourneyLibraryService,
    private readonly access: JourneyAccessService,
  ) {}

  // ── parent ──────────────────────────────────────────────────────────────────

  @Get('children/:childId/library')
  async library_(@Req() req: any, @Param('childId') childId: string, @Query() query: LibraryQuery) {
    const child = await this.access.assertGuardian(req.user.id, childId);
    return this.library.list(req.user, child, query);
  }

  @Get('children/:childId/screening-summary')
  async screeningSummary(@Req() req: any, @Param('childId') childId: string) {
    const child = await this.access.assertGuardian(req.user.id, childId);
    return { summary: await this.library.screeningSummary(req.user, child) };
  }

  @Get('children/:childId/items')
  listItems(@Req() req: any, @Param('childId') childId: string) {
    return this.journey.listItems(req.user, childId);
  }

  @Post('children/:childId/items')
  saveItem(@Req() req: any, @Param('childId') childId: string, @Body() body: any) {
    return this.journey.saveItem(req.user, childId, body);
  }

  @Patch('items/:itemId')
  updateItem(@Req() req: any, @Param('itemId') itemId: string, @Body() body: any) {
    return this.journey.updateItem(req.user, itemId, body);
  }

  @Delete('items/:itemId')
  removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.journey.removeItem(req.user, itemId);
  }

  @Post('children/:childId/logs')
  log(@Req() req: any, @Param('childId') childId: string, @Body() body: any) {
    return this.journey.log(req.user, childId, body);
  }

  @Get('children/:childId/progress')
  progress(@Req() req: any, @Param('childId') childId: string, @Query('domain') domain?: string) {
    return this.journey.progress(req.user, childId, { domain });
  }

  @Get('children/:childId/share-targets')
  shareTargets(@Req() req: any, @Param('childId') childId: string) {
    return this.journey.shareTargets(req.user, childId);
  }

  @Get('children/:childId/shares')
  listShares(@Req() req: any, @Param('childId') childId: string) {
    return this.journey.listShares(req.user, childId);
  }

  @Post('children/:childId/shares')
  createShare(@Req() req: any, @Param('childId') childId: string, @Body() body: any) {
    return this.journey.createShare(req.user, childId, body);
  }

  @Delete('shares/:shareId')
  revokeShare(@Req() req: any, @Param('shareId') shareId: string) {
    return this.journey.revokeShare(req.user, shareId);
  }

  // ── therapist ───────────────────────────────────────────────────────────────

  @Get('shared-with-me')
  sharedWithMe(@Req() req: any) {
    return this.journey.sharedWithMe(req.user);
  }

  @Get('shared-with-me/:shareId/progress')
  sharedProgress(@Req() req: any, @Param('shareId') shareId: string, @Query('domain') domain?: string) {
    return this.journey.sharedProgress(req.user, shareId, { domain });
  }

  @Get('my-clients')
  myClients(@Req() req: any) {
    return this.journey.myClients(req.user);
  }

  @Get('assignable')
  assignable(@Req() req: any, @Query() query: Record<string, string>) {
    return this.journey.assignable(req.user, query);
  }

  @Post('clients/:childId/assign')
  assign(@Req() req: any, @Param('childId') childId: string, @Body() body: any) {
    return this.journey.assign(req.user, childId, body);
  }

  @Get('clients/:childId/assigned')
  assigned(@Req() req: any, @Param('childId') childId: string) {
    return this.journey.assignedTo(req.user, childId);
  }

  @Delete('assigned/:itemId')
  unassign(@Req() req: any, @Param('itemId') itemId: string) {
    return this.journey.unassign(req.user, itemId);
  }
}
