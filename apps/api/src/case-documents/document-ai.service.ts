import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

export interface GeneratedReport {
  title: string;
  content: string;
  sections: Array<{ heading: string; body: string }>;
}

@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);
  private openai: OpenAI | null = null;
  private readonly modelName: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({ apiKey });
    }
    this.modelName = this.configService.get<string>('AI_MODEL', 'gpt-5');
  }

  private get isAvailable(): boolean {
    return !!this.openai;
  }

  /**
   * Generate a progress/case summary/discharge report from case data.
   */
  async generateReport(
    caseId: string,
    reportType: 'progress' | 'case_summary' | 'discharge',
    dateFrom?: string,
    dateTo?: string,
    focusAreas?: string,
  ): Promise<GeneratedReport> {
    // Gather case data
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: { conditions: true },
        },
        primaryTherapist: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!caseRecord) {
      return { title: 'Report', content: 'Case not found.', sections: [] };
    }

    // Fetch sessions in date range
    const sessionWhere: any = { caseId };
    if (dateFrom || dateTo) {
      sessionWhere.scheduledAt = {};
      if (dateFrom) sessionWhere.scheduledAt.gte = new Date(dateFrom);
      if (dateTo) sessionWhere.scheduledAt.lte = new Date(dateTo);
    }
    const sessions = await this.prisma.caseSession.findMany({
      where: sessionWhere,
      orderBy: { scheduledAt: 'asc' },
      take: 50,
      select: {
        scheduledAt: true,
        attendanceStatus: true,
        rawNotes: true,
        aiSummary: true,
        actualDuration: true,
        goalProgress: {
          include: { goal: { select: { goalText: true, domain: true } } },
        },
      },
    });

    // Fetch current IEP goals
    const latestIEP = await this.prisma.iEP.findFirst({
      where: { caseId, status: { in: ['ACTIVE', 'APPROVED', 'DRAFT'] } },
      orderBy: { version: 'desc' },
      include: { goals: true },
    });

    if (!this.isAvailable) {
      return this.buildFallbackReport(caseRecord, sessions, latestIEP, reportType);
    }

    const childAge = this.calculateAge(caseRecord.child.dateOfBirth);
    const conditions = caseRecord.child.conditions.map((c) => c.conditionType).join(', ');

    const sessionSummaries = sessions
      .map((s) => {
        const summary = s.aiSummary || s.rawNotes || '';
        const progressNotes = s.goalProgress
          .map((gp) => `[${gp.goal.domain}] ${gp.goal.goalText}: ${gp.progressValue ?? 'N/A'}%`)
          .join('; ');
        return `Date: ${s.scheduledAt.toISOString().split('T')[0]}, Duration: ${s.actualDuration || 'N/A'}min, Status: ${s.attendanceStatus}\nSummary: ${summary.slice(0, 300)}\nGoal Progress: ${progressNotes || 'None recorded'}`;
      })
      .join('\n\n');

    const goalSummary = latestIEP?.goals
      .map((g) => `[${g.domain}] ${g.goalText} — Progress: ${g.currentProgress}%, Status: ${g.status}`)
      .join('\n') || 'No active IEP goals';

    const typeInstructions: Record<string, string> = {
      progress: 'Generate a formal progress report covering treatment progress, goal status, and recommendations for continued therapy.',
      case_summary: 'Generate a comprehensive case summary including history, current status, interventions used, and outcomes.',
      discharge: 'Generate a discharge summary including treatment summary, outcomes achieved, recommendations, and follow-up plan.',
    };

    const prompt = [
      {
        role: 'system' as const,
        content: [
          'You are a clinical documentation specialist for pediatric therapy.',
          'Generate professional clinical reports suitable for sharing with schools, insurance, or other providers.',
          'Use formal clinical language. Structure the report with clear sections.',
          'Do not fabricate data not present in the provided information.',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: [
          `Patient: ${caseRecord.child.firstName}, Age: ${childAge}`,
          `Diagnoses: ${conditions || 'None documented'}`,
          `Primary Therapist: ${caseRecord.primaryTherapist.user.name}`,
          `Case Number: ${caseRecord.caseNumber}`,
          `Case Status: ${caseRecord.status}`,
          '',
          '--- Session History ---',
          sessionSummaries || 'No sessions recorded.',
          '',
          '--- Current Goals ---',
          goalSummary,
          '',
          ...(focusAreas ? [`Focus Areas: ${focusAreas}`] : []),
          '',
          typeInstructions[reportType] || typeInstructions.progress,
        ].join('\n'),
      },
    ];

    try {
      const params: any = {
        model: this.modelName,
        messages: prompt,
        max_completion_tokens: 3000,
      };
      if (!this.modelName.startsWith('gpt-5')) params.temperature = 0.3;

      const response = await this.openai!.chat.completions.create(params);
      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return this.buildFallbackReport(caseRecord, sessions, latestIEP, reportType);
      }

      const titleMap = {
        progress: 'Progress Report',
        case_summary: 'Case Summary Report',
        discharge: 'Discharge Summary',
      };

      return {
        title: `${titleMap[reportType]} — ${caseRecord.child.firstName} (${caseRecord.caseNumber})`,
        content,
        sections: [],
      };
    } catch (err) {
      this.logger.error('AI report generation failed', err);
      return this.buildFallbackReport(caseRecord, sessions, latestIEP, reportType);
    }
  }

  private buildFallbackReport(
    caseRecord: any,
    sessions: any[],
    latestIEP: any,
    reportType: string,
  ): GeneratedReport {
    const sections = [
      {
        heading: 'Patient Information',
        body: `Name: ${caseRecord.child.firstName}\nCase Number: ${caseRecord.caseNumber}\nStatus: ${caseRecord.status}`,
      },
      {
        heading: 'Session Summary',
        body: `Total sessions in period: ${sessions.length}\nCompleted: ${sessions.filter((s: any) => s.attendanceStatus === 'PRESENT').length}`,
      },
      {
        heading: 'Current Goals',
        body: latestIEP?.goals
          .map((g: any) => `• [${g.domain}] ${g.goalText} — ${g.currentProgress}%`)
          .join('\n') || 'No active goals.',
      },
    ];

    return {
      title: `${reportType === 'discharge' ? 'Discharge Summary' : 'Progress Report'} — ${caseRecord.child.firstName}`,
      content: sections.map((s) => `## ${s.heading}\n${s.body}`).join('\n\n'),
      sections,
    };
  }

  private calculateAge(dob: Date): string {
    const totalMonths =
      (new Date().getFullYear() - dob.getFullYear()) * 12 +
      (new Date().getMonth() - dob.getMonth());
    if (totalMonths < 24) return `${totalMonths} months`;
    return `${Math.floor(totalMonths / 12)} years ${totalMonths % 12} months`;
  }
}
