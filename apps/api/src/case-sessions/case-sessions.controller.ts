import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CaseSessionsService } from './case-sessions.service';
import { CaseAiService } from './case-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCaseSessionDto,
  UpdateCaseSessionDto,
  LogGoalProgressDto,
  BulkLogGoalProgressDto,
  GenerateAiSummaryDto,
  ListCaseSessionsQueryDto,
} from './dto/case-sessions.dto';
import { SessionNoteFormat } from '@prisma/client';

@Controller('cases/:caseId/sessions')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseSessionsController {
  constructor(
    private sessionsService: CaseSessionsService,
    private caseAiService: CaseAiService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @CaseAccess('edit')
  async createSession(
    @Param('caseId') caseId: string,
    @Body() dto: CreateCaseSessionDto,
    @Req() req: any,
  ) {
    return this.sessionsService.createSession(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listSessions(
    @Param('caseId') caseId: string,
    @Query() query: ListCaseSessionsQueryDto,
  ) {
    return this.sessionsService.listSessions(caseId, query);
  }

  @Get(':sessionId')
  @CaseAccess('view')
  async getSession(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSession(caseId, sessionId);
  }

  @Patch(':sessionId')
  @CaseAccess('edit')
  async updateSession(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateCaseSessionDto,
    @Req() req: any,
  ) {
    return this.sessionsService.updateSession(caseId, sessionId, req.user.id, dto);
  }

  // ─── SIGN SESSION ─────────────────────────────────────────

  @Post(':sessionId/sign')
  @CaseAccess('edit')
  async signSession(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.sessionsService.signSession(caseId, sessionId, req.user.id);
  }

  // ─── GOAL PROGRESS ────────────────────────────────────────

  @Post(':sessionId/goal-progress')
  @CaseAccess('edit')
  async logGoalProgress(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: LogGoalProgressDto,
    @Req() req: any,
  ) {
    return this.sessionsService.logGoalProgress(caseId, sessionId, req.user.id, dto);
  }

  @Post(':sessionId/goal-progress/bulk')
  @CaseAccess('edit')
  async bulkLogGoalProgress(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkLogGoalProgressDto,
    @Req() req: any,
  ) {
    return this.sessionsService.bulkLogGoalProgress(caseId, sessionId, req.user.id, dto);
  }

  // ─── AI SUMMARY ────────────────────────────────────────────

  @Post(':sessionId/ai-summary')
  @CaseAccess('edit')
  async generateAiSummary(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: GenerateAiSummaryDto,
  ) {
    // Fetch the session with all context needed for AI
    const session = await this.sessionsService.getSession(caseId, sessionId);

    if (!session.rawNotes?.trim()) {
      throw new NotFoundException('No raw notes found on this session to summarize');
    }

    // Fetch child info for context
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: { select: { firstName: true, dateOfBirth: true } },
      },
    });

    const childAge = caseRecord?.child?.dateOfBirth
      ? this.calculateAge(caseRecord.child.dateOfBirth)
      : undefined;

    const result = await this.caseAiService.generateSessionSummary({
      rawNotes: session.rawNotes,
      format: dto.format || session.noteFormat || SessionNoteFormat.SOAP,
      sessionType: session.sessionType || undefined,
      duration: session.actualDuration || undefined,
      childName: caseRecord?.child?.firstName,
      childAge,
      goalsAddressed: session.goalProgress.map((gp) => ({
        goalText: gp.goal.goalText,
        domain: gp.goal.domain,
        progressValue: gp.progressValue || undefined,
      })),
      structuredNotes: session.structuredNotes as any,
    });

    // Save summary on the session
    await this.sessionsService.saveAiSummary(sessionId, result.summary);

    return result;
  }

  @Post(':sessionId/enhance-notes')
  @CaseAccess('edit')
  async enhanceClinicalLanguage(
    @Param('caseId') caseId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.sessionsService.getSession(caseId, sessionId);

    if (!session.rawNotes?.trim()) {
      throw new NotFoundException('No raw notes found to enhance');
    }

    const enhanced = await this.caseAiService.enhanceClinicalLanguage(session.rawNotes);
    return { original: session.rawNotes, enhanced };
  }

  private calculateAge(dob: Date): string {
    const now = new Date();
    const years = now.getFullYear() - dob.getFullYear();
    const months = now.getMonth() - dob.getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 24) return `${totalMonths} months`;
    return `${Math.floor(totalMonths / 12)} years ${totalMonths % 12} months`;
  }
}
