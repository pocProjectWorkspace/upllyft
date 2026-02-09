import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { WorksheetsService } from './worksheets.service';
import { WorksheetDataSourcesService } from './worksheet-data-sources.service';
import { WorksheetAssignmentService } from './worksheet-assignment.service';
import { WorksheetCommunityService } from './worksheet-community.service';
import { WorksheetReviewService } from './worksheet-review.service';
import { WorksheetModerationService } from './worksheet-moderation.service';
import { WorksheetCompletionService } from './worksheet-completion.service';
import { WorksheetAnalyticsService } from './worksheet-analytics.service';
import { WorksheetRecommendationService } from './worksheet-recommendation.service';
import { WorksheetVersionService } from './worksheet-version.service';
import { WorksheetContributorService } from './worksheet-contributor.service';
import { WorksheetAccessGuard } from './guards/worksheet-access.guard';
import {
  GenerateWorksheetDto,
  UpdateWorksheetDto,
  ListWorksheetsDto,
  RegenerateSectionDto,
  RegenerateImageDto,
  ParseReportDto,
  AssignWorksheetDto,
  UpdateAssignmentDto,
  ListAssignmentsDto,
  LinkCaseDto,
  PublishWorksheetDto,
  BrowseCommunityDto,
  CreateReviewDto,
  UpdateReviewDto,
  ListReviewsDto,
  FlagWorksheetDto,
  ResolveFlagDto,
  ListFlagsDto,
  RecordCompletionDto,
  UpdateCompletionDto,
  ApplyVerificationDto,
} from './dto';

@Controller('worksheets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorksheetsController {
  constructor(
    private readonly worksheetsService: WorksheetsService,
    private readonly dataSourcesService: WorksheetDataSourcesService,
    private readonly assignmentService: WorksheetAssignmentService,
    private readonly communityService: WorksheetCommunityService,
    private readonly reviewService: WorksheetReviewService,
    private readonly moderationService: WorksheetModerationService,
    private readonly completionService: WorksheetCompletionService,
    private readonly analyticsService: WorksheetAnalyticsService,
    private readonly recommendationService: WorksheetRecommendationService,
    private readonly versionService: WorksheetVersionService,
    private readonly contributorService: WorksheetContributorService,
  ) {}

  // ─── Generation ────────────────────────────────────────────

  @Post('generate')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async generate(
    @Body() dto: GenerateWorksheetDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.worksheetsService.generate(dto, req.user.id);
  }

  // ─── Data Source Endpoints ─────────────────────────────────

  @Get('data-sources/screenings/:childId')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getChildScreenings(@Param('childId') childId: string) {
    return this.dataSourcesService.getChildScreenings(childId);
  }

  @Get('data-sources/screenings/:assessmentId/summary')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getScreeningSummary(@Param('assessmentId') assessmentId: string) {
    return this.dataSourcesService.getScreeningSummary(assessmentId);
  }

  @Post('data-sources/parse-report')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async parseReport(@Body() dto: ParseReportDto) {
    return this.dataSourcesService.parseReport(dto.reportUrl, dto.fileType ?? 'image');
  }

  @Get('data-sources/session-notes/:caseId')
  @Roles(Role.THERAPIST, Role.ADMIN)
  async getSessionNotes(@Param('caseId') caseId: string) {
    return this.dataSourcesService.getSessionNotes(caseId);
  }

  @Get('data-sources/iep-goals/:caseId')
  @Roles(Role.THERAPIST, Role.ADMIN)
  async getIEPGoals(@Param('caseId') caseId: string) {
    return this.dataSourcesService.getIEPGoals(caseId);
  }

  // ─── Assignment Endpoints ──────────────────────────────────

  @Post(':id/assign')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @UseGuards(WorksheetAccessGuard)
  async assignWorksheet(
    @Param('id') id: string,
    @Body() dto: AssignWorksheetDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.assignmentService.assign(id, dto, req.user.id);
  }

  @Get('assignments/sent')
  @Roles(Role.THERAPIST, Role.ADMIN)
  async getSentAssignments(
    @Query() dto: ListAssignmentsDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.assignmentService.getSentAssignments(req.user.id, dto);
  }

  @Get('assignments/received')
  @Roles(Role.USER)
  async getReceivedAssignments(
    @Query() dto: ListAssignmentsDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.assignmentService.getReceivedAssignments(req.user.id, dto);
  }

  @Get('assignments/:assignmentId')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getAssignment(
    @Param('assignmentId') assignmentId: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.assignmentService.getAssignment(assignmentId, req.user.id);
  }

  @Patch('assignments/:assignmentId')
  @Roles(Role.USER)
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.assignmentService.updateAssignment(assignmentId, dto, req.user.id);
  }

  // ─── Community Library ───────────────────────────────────

  @Post(':id/publish')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  @UseGuards(WorksheetAccessGuard)
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishWorksheetDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.communityService.publish(id, dto, req.user.id);
  }

  @Post(':id/unpublish')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  @UseGuards(WorksheetAccessGuard)
  async unpublish(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.communityService.unpublish(id, req.user.id);
  }

  @Get('community')
  async browseCommunity(@Query() dto: BrowseCommunityDto) {
    return this.communityService.browse(dto);
  }

  @Post(':id/clone')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async cloneWorksheet(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.communityService.clone(id, req.user.id);
  }

  // ─── Ratings & Reviews ──────────────────────────────────

  @Post(':id/reviews')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async createReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.reviewService.create(id, dto, req.user.id);
  }

  @Get(':id/reviews')
  async listReviews(
    @Param('id') id: string,
    @Query() dto: ListReviewsDto,
  ) {
    return this.reviewService.list(id, dto);
  }

  @Put('reviews/:reviewId')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.reviewService.update(reviewId, dto, req.user.id);
  }

  @Delete('reviews/:reviewId')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.reviewService.remove(reviewId, req.user.id);
  }

  @Post('reviews/:reviewId/helpful')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async markReviewHelpful(
    @Param('reviewId') reviewId: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.reviewService.markHelpful(reviewId, req.user.id);
  }

  // ─── Moderation ──────────────────────────────────────────

  @Post(':id/flag')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async flagWorksheet(
    @Param('id') id: string,
    @Body() dto: FlagWorksheetDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.moderationService.flagWorksheet(id, dto, req.user.id);
  }

  @Get('moderation/queue')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getModerationQueue(@Query() dto: ListFlagsDto) {
    return this.moderationService.getModerationQueue(dto);
  }

  @Patch('moderation/flags/:flagId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async resolveFlag(
    @Param('flagId') flagId: string,
    @Body() dto: ResolveFlagDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.moderationService.resolveFlag(flagId, dto, req.user.id);
  }

  @Get('moderation/stats')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getModerationStats() {
    return this.moderationService.getStats();
  }

  // ─── Completion Tracking ────────────────────────────────────

  @Post(':id/completions')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async recordCompletion(
    @Param('id') id: string,
    @Body() dto: RecordCompletionDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.completionService.recordCompletion(id, dto, req.user.id);
  }

  @Get(':id/completions')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getWorksheetCompletions(@Param('id') id: string) {
    return this.completionService.getWorksheetCompletions(id);
  }

  @Patch('completions/:completionId')
  @Roles(Role.USER)
  async updateCompletion(
    @Param('completionId') completionId: string,
    @Body() dto: UpdateCompletionDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.completionService.updateCompletion(completionId, dto, req.user.id);
  }

  @Get('children/:childId/completions')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getChildCompletions(
    @Param('childId') childId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.completionService.getChildCompletionHistory(
      childId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('children/:childId/completion-stats')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getCompletionStats(@Param('childId') childId: string) {
    return this.completionService.getCompletionStats(childId);
  }

  // ─── Analytics ───────────────────────────────────────────────

  @Get('analytics/child/:childId')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getChildProgressTimeline(@Param('childId') childId: string) {
    return this.analyticsService.getChildProgressTimeline(childId);
  }

  @Get('analytics/worksheet/:id/effectiveness')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getWorksheetEffectiveness(@Param('id') id: string) {
    return this.analyticsService.getWorksheetEffectivenessScore(id);
  }

  @Get('analytics/top-effective')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getMostEffectiveWorksheets(
    @Query('domain') domain?: string,
    @Query('condition') condition?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getMostEffectiveWorksheets(
      domain,
      condition,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ─── Recommendations ────────────────────────────────────────

  @Get('recommendations/:childId')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getRecommendations(
    @Param('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationService.recommendForChild(
      childId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('difficulty/suggest/:childId')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async suggestDifficulty(
    @Param('childId') childId: string,
    @Query('domain') domain?: string,
  ) {
    return this.recommendationService.suggestDifficulty(childId, domain);
  }

  // ─── Version Tracking ──────────────────────────────────────

  @Post(':id/create-version')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  @UseGuards(WorksheetAccessGuard)
  async createVersion(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.versionService.createNewVersion(id, req.user.id);
  }

  @Get(':id/versions')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async getVersionHistory(@Param('id') id: string) {
    return this.versionService.getVersionHistory(id);
  }

  @Get('children/:childId/journey')
  @Roles(Role.USER, Role.THERAPIST, Role.ADMIN)
  async getChildJourney(@Param('childId') childId: string) {
    return this.versionService.getChildJourney(childId);
  }

  // ─── Verified Contributors ─────────────────────────────────

  @Get('contributors/top')
  async getTopContributors(@Query('limit') limit?: string) {
    return this.contributorService.getTopContributors(
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('contributors/profile/:userId')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR, Role.ADMIN)
  async getContributorProfile(@Param('userId') userId: string) {
    return this.contributorService.getContributorProfile(userId);
  }

  @Post('contributors/apply')
  @Roles(Role.USER, Role.THERAPIST, Role.EDUCATOR)
  async applyForVerification(
    @Body() dto: ApplyVerificationDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.contributorService.applyForVerification(req.user.id, dto.bio);
  }

  @Patch('contributors/:userId/verify')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async approveVerification(
    @Param('userId') userId: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.contributorService.approveVerification(userId, req.user.id);
  }

  @Patch('contributors/:userId/revoke')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async revokeVerification(
    @Param('userId') userId: string,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.contributorService.revokeVerification(userId, req.user.id);
  }

  // ─── Case Integration ─────────────────────────────────────

  @Post(':id/link-case')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @UseGuards(WorksheetAccessGuard)
  async linkCase(
    @Param('id') id: string,
    @Body() dto: LinkCaseDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.worksheetsService.linkCase(id, dto, req.user.id);
  }

  @Get('cases/:caseId/worksheets')
  @Roles(Role.THERAPIST, Role.ADMIN)
  async getCaseWorksheets(@Param('caseId') caseId: string) {
    return this.worksheetsService.getCaseWorksheets(caseId);
  }

  // ─── Library & CRUD ────────────────────────────────────────

  @Get('my-library')
  async getMyLibrary(
    @Query() dto: ListWorksheetsDto,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.worksheetsService.getMyLibrary(req.user.id, dto);
  }

  @Get(':id/status')
  @UseGuards(WorksheetAccessGuard)
  async getStatus(@Param('id') id: string) {
    return this.worksheetsService.getStatus(id);
  }

  @Get(':id')
  @UseGuards(WorksheetAccessGuard)
  async getOne(@Param('id') id: string) {
    return this.worksheetsService.getOne(id);
  }

  @Get(':id/download')
  @UseGuards(WorksheetAccessGuard)
  async download(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const worksheet = await this.worksheetsService.getOne(id);

    if (!worksheet.pdfUrl) {
      reply.status(202).send({
        message: 'PDF is still being generated. Please try again shortly.',
        status: worksheet.status,
      });
      return;
    }

    reply.redirect(worksheet.pdfUrl);
  }

  @Put(':id')
  @UseGuards(WorksheetAccessGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorksheetDto,
  ) {
    return this.worksheetsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(WorksheetAccessGuard)
  async remove(@Param('id') id: string) {
    return this.worksheetsService.remove(id);
  }

  @Post(':id/regenerate-section')
  @UseGuards(WorksheetAccessGuard)
  async regenerateSection(
    @Param('id') id: string,
    @Body() dto: RegenerateSectionDto,
  ) {
    return this.worksheetsService.regenerateSection(id, dto);
  }

  @Post(':id/regenerate-image')
  @UseGuards(WorksheetAccessGuard)
  async regenerateImage(
    @Param('id') id: string,
    @Body() dto: RegenerateImageDto,
  ) {
    return this.worksheetsService.regenerateImage(id, dto);
  }
}
