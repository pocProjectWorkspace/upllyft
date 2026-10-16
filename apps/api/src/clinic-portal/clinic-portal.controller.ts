import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicPortalService } from './clinic-portal.service';

/** Parent-facing Clinic Portal. Every route checks the caller is the child's guardian. */
@Controller('clinic-portal/children/:childId')
@UseGuards(JwtAuthGuard)
export class ClinicPortalController {
  constructor(private readonly portal: ClinicPortalService) {}

  @Get()
  get(@Req() req: any, @Param('childId') childId: string) {
    return this.portal.portal(req.user, childId);
  }

  @Get('sessions/:sessionId/slots')
  slots(@Req() req: any, @Param('childId') childId: string, @Param('sessionId') sessionId: string) {
    return this.portal.slots(req.user, childId, sessionId);
  }

  @Post('sessions/:sessionId/reschedule')
  reschedule(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { startAt?: string },
  ) {
    return this.portal.reschedule(req.user, childId, sessionId, body?.startAt);
  }

  @Post('sessions/:sessionId/cancel')
  cancel(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    return this.portal.cancel(req.user, childId, sessionId, body?.reason);
  }

  @Get('sessions/:sessionId/summary')
  summary(@Req() req: any, @Param('childId') childId: string, @Param('sessionId') sessionId: string) {
    return this.portal.summary(req.user, childId, sessionId);
  }

  @Get('reports/:reviewId')
  report(@Req() req: any, @Param('childId') childId: string, @Param('reviewId') reviewId: string) {
    return this.portal.report(req.user, childId, reviewId);
  }

  @Post('activities/:itemId/seen')
  seen(@Req() req: any, @Param('childId') childId: string, @Param('itemId') itemId: string) {
    return this.portal.markSeen(req.user, childId, itemId);
  }

  @Put('clinics/:facilityId/consents')
  consent(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('facilityId') facilityId: string,
    @Body() body: { key?: string; value?: boolean },
  ) {
    return this.portal.setConsent(req.user, childId, facilityId, body?.key, body?.value);
  }

  @Get('intake/:caseId')
  intake(@Req() req: any, @Param('childId') childId: string, @Param('caseId') caseId: string) {
    return this.portal.intake(req.user, childId, caseId);
  }

  @Post('intake/:caseId')
  submitIntake(@Req() req: any, @Param('childId') childId: string, @Param('caseId') caseId: string, @Body() body: any) {
    return this.portal.submitIntake(req.user, childId, caseId, body);
  }
}
