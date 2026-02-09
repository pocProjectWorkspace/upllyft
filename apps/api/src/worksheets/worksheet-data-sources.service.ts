import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import * as puppeteer from 'puppeteer';
import {
  extractDomainScoreSummaries,
  mapFlaggedDomainsToWorksheetDomains,
  DomainScoreSummary,
} from './constants/domain-mapping';

export interface DataSourceResult {
  childAge: number;
  conditions: string[];
  developmentalNotes: string;
  suggestedDomains: string[];
  contextData?: Record<string, any>;
}

export interface ScreeningSummary {
  assessmentId: string;
  childId: string;
  childName: string;
  ageGroup: string;
  completedAt: string | null;
  overallScore: number | null;
  domainScores: DomainScoreSummary[];
  flaggedDomains: string[];
  suggestedWorksheetDomains: string[];
}

export interface ParsedReportData {
  childAge?: number;
  conditions: string[];
  strengths: string[];
  challenges: string[];
  recommendations: string[];
  domains: Array<{
    name: string;
    worksheetDomain: string;
    observations: string;
    level?: string;
  }>;
  rawSummary: string;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

@Injectable()
export class WorksheetDataSourcesService {
  private readonly logger = new Logger(WorksheetDataSourcesService.name);
  private _supabase: SupabaseClient | null = null;
  private readonly anthropic: Anthropic;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = this.configService.get<string>(
      'ANTHROPIC_MODEL',
      'claude-sonnet-4-20250514',
    );
  }

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL', '');
      const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
      if (!url || !key) {
        throw new Error(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  // ─── UFMF Screening ───────────────────────────────────────

  async getChildScreenings(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, firstName: true, nickname: true },
    });

    if (!child) throw new NotFoundException('Child not found');

    const assessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        ageGroup: true,
        overallScore: true,
        flaggedDomains: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    return { child, assessments };
  }

  async getScreeningSummary(assessmentId: string): Promise<ScreeningSummary> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: {
          select: { id: true, firstName: true, nickname: true, dateOfBirth: true },
        },
      },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    const domainScores = assessment.domainScores
      ? extractDomainScoreSummaries(
          assessment.domainScores as Record<string, any>,
          assessment.flaggedDomains,
        )
      : [];

    const suggestedWorksheetDomains = mapFlaggedDomainsToWorksheetDomains(
      assessment.flaggedDomains,
    );

    return {
      assessmentId: assessment.id,
      childId: assessment.childId,
      childName: assessment.child.firstName,
      ageGroup: assessment.ageGroup,
      completedAt: assessment.completedAt?.toISOString() ?? null,
      overallScore: assessment.overallScore,
      domainScores,
      flaggedDomains: assessment.flaggedDomains,
      suggestedWorksheetDomains,
    };
  }

  async resolveScreeningDataSource(
    assessmentId: string,
    childId: string,
  ): Promise<DataSourceResult> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: {
          include: {
            conditions: true,
          },
        },
      },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.childId !== childId) {
      throw new BadRequestException('Assessment does not belong to this child');
    }

    const domainScores = assessment.domainScores as Record<string, any> ?? {};
    const scoreSummaries = extractDomainScoreSummaries(
      domainScores,
      assessment.flaggedDomains,
    );

    const ageMonths = Math.floor(
      (Date.now() - assessment.child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );

    const flaggedDomainDescriptions = scoreSummaries
      .filter((s) => s.flagged)
      .map((s) => `${s.domain}: score ${s.score}/${s.maxScore}`)
      .join('; ');

    return {
      childAge: Math.round(ageMonths),
      conditions: assessment.child.conditions.map((c) => c.conditionType),
      developmentalNotes: `UFMF Screening results (${assessment.ageGroup}): Overall score ${assessment.overallScore ?? 'N/A'}. Flagged domains: ${flaggedDomainDescriptions || 'None'}. Assessment completed ${assessment.completedAt?.toLocaleDateString() ?? 'N/A'}.`,
      suggestedDomains: mapFlaggedDomainsToWorksheetDomains(assessment.flaggedDomains),
      contextData: {
        assessmentId: assessment.id,
        domainScores: scoreSummaries,
        overallScore: assessment.overallScore,
        flaggedDomains: assessment.flaggedDomains,
      },
    };
  }

  // ─── Uploaded Report Parsing ───────────────────────────────

  async uploadReport(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const filePath = `reports/${Date.now()}-${fileName}`;

    const { error } = await this.supabase.storage
      .from('worksheet-images') // reuse images bucket for report uploads
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Report upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('worksheet-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async parseReport(
    reportUrl: string,
    fileType: 'pdf' | 'image' = 'image',
  ): Promise<ParsedReportData> {
    this.logger.log(`Parsing report: ${reportUrl} (type: ${fileType})`);

    let imageDataList: Array<{
      type: 'image';
      source: { type: 'base64'; media_type: ImageMediaType; data: string };
    }> = [];

    if (fileType === 'pdf') {
      imageDataList = await this.convertPdfToImages(reportUrl);
    } else {
      const response = await fetch(reportUrl);
      if (!response.ok) throw new Error('Failed to download report image');
      const buffer = Buffer.from(await response.arrayBuffer());
      const rawMediaType = response.headers.get('content-type') || 'image/png';
      const mediaType = this.normalizeMediaType(rawMediaType);
      imageDataList = [{
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType,
          data: buffer.toString('base64'),
        },
      }];
    }

    const result = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: `You are an expert pediatric therapy report analyzer. Extract structured developmental data from therapy/assessment reports. You MUST respond with valid JSON only.`,
      messages: [{
        role: 'user',
        content: [
          ...imageDataList,
          {
            type: 'text' as const,
            text: `Analyze this therapy/assessment report and extract the following information as JSON:

{
  "childAge": number | null,  // age in months if mentioned
  "conditions": ["string"],   // diagnosed conditions mentioned
  "strengths": ["string"],    // developmental strengths noted
  "challenges": ["string"],   // developmental challenges/concerns noted
  "recommendations": ["string"], // therapy recommendations
  "domains": [
    {
      "name": "string",           // domain name as stated in report
      "worksheetDomain": "MOTOR" | "LANGUAGE" | "SOCIAL" | "COGNITIVE" | "SENSORY" | "ADAPTIVE",
      "observations": "string",   // key observations for this domain
      "level": "string"           // developmental level if stated (e.g., "below age", "age-appropriate")
    }
  ],
  "rawSummary": "string"  // 2-3 sentence summary of the entire report
}

Map each observed developmental area to one of the standard worksheet domains:
- MOTOR: gross/fine motor, coordination, handwriting
- LANGUAGE: speech, language, communication, articulation
- SOCIAL: social skills, emotional regulation, play skills, relationships
- COGNITIVE: attention, memory, problem-solving, academics, executive function
- SENSORY: sensory processing, sensory integration, sensory-seeking/avoiding
- ADAPTIVE: self-care, daily living, routines, independence`,
          },
        ],
      }],
    });

    const textBlock = result.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude Vision');
    }

    let parsed: ParsedReportData;
    try {
      let cleaned = textBlock.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      parsed = JSON.parse(cleaned.trim());
    } catch {
      this.logger.error('Failed to parse Claude Vision response');
      throw new Error('Failed to parse report. Please try again.');
    }

    return parsed;
  }

  async resolveUploadedReportDataSource(
    parsedData: Record<string, any>,
    childId?: string,
  ): Promise<DataSourceResult> {
    const data = parsedData as ParsedReportData;

    let childAge = data.childAge ?? 48;
    const conditions = data.conditions ?? [];

    // If childId provided, get child info from DB
    if (childId) {
      const child = await this.prisma.child.findUnique({
        where: { id: childId },
        include: {
          conditions: true,
        },
      });
      if (child) {
        childAge = Math.round(
          (Date.now() - child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
        );
        const dbConditions = child.conditions.map((c) => c.conditionType);
        conditions.push(...dbConditions.filter((c) => !conditions.includes(c)));
      }
    }

    const suggestedDomains = (data.domains ?? [])
      .map((d) => d.worksheetDomain)
      .filter((d, i, arr) => arr.indexOf(d) === i);

    const notes = [
      data.rawSummary ?? '',
      data.strengths?.length ? `Strengths: ${data.strengths.join(', ')}` : '',
      data.challenges?.length ? `Challenges: ${data.challenges.join(', ')}` : '',
      data.recommendations?.length ? `Recommendations: ${data.recommendations.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return {
      childAge,
      conditions,
      developmentalNotes: notes,
      suggestedDomains,
      contextData: { parsedReport: data },
    };
  }

  private normalizeMediaType(contentType: string): ImageMediaType {
    const type = contentType.split(';')[0].trim().toLowerCase();
    const valid: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (valid.includes(type as ImageMediaType)) return type as ImageMediaType;
    return 'image/png';
  }

  private async convertPdfToImages(
    pdfUrl: string,
  ): Promise<Array<{
    type: 'image';
    source: { type: 'base64'; media_type: ImageMediaType; data: string };
  }>> {
    const images: Array<{
      type: 'image';
      source: { type: 'base64'; media_type: ImageMediaType; data: string };
    }> = [];

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.goto(pdfUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.setViewport({ width: 1200, height: 1600 });

      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      await browser.close();
      browser = null;

      images.push({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png' as const,
          data: Buffer.from(screenshotBuffer).toString('base64'),
        },
      });
    } catch (error) {
      this.logger.error(`PDF to image conversion failed: ${error.message}`);
      throw new Error('Failed to process PDF report');
    } finally {
      if (browser) await browser.close();
    }

    return images;
  }

  // ─── Session Notes ─────────────────────────────────────────

  async getSessionNotes(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          select: { id: true, firstName: true, nickname: true },
        },
        sessions: {
          select: {
            id: true,
            scheduledAt: true,
            rawNotes: true,
            aiSummary: true,
            sessionType: true,
            goalProgress: {
              include: {
                goal: {
                  select: { id: true, domain: true, goalText: true },
                },
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');

    return {
      caseId: caseRecord.id,
      child: caseRecord.child,
      sessions: caseRecord.sessions.map((s) => ({
        id: s.id,
        date: s.scheduledAt.toISOString(),
        sessionType: s.sessionType,
        hasNotes: !!(s.rawNotes || s.aiSummary),
        hasSummary: !!s.aiSummary,
        goalProgressCount: s.goalProgress.length,
      })),
    };
  }

  async resolveSessionNotesDataSource(
    caseId: string,
    sessionIds: string[],
  ): Promise<DataSourceResult> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: {
            conditions: true,
          },
        },
        sessions: {
          where: { id: { in: sessionIds } },
          include: {
            goalProgress: {
              include: {
                goal: {
                  select: {
                    id: true,
                    domain: true,
                    goalText: true,
                    currentProgress: true,
                  },
                },
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');
    if (caseRecord.sessions.length === 0) {
      throw new BadRequestException('No matching sessions found');
    }

    const ageMonths = Math.round(
      (Date.now() - caseRecord.child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );

    // Extract domains from session goal progress
    const domains = new Set<string>();
    const sessionSummaries = caseRecord.sessions.map((s) => {
      const goalProgressItems = s.goalProgress.map((gp) => {
        if (gp.goal.domain) domains.add(gp.goal.domain.toUpperCase());
        return {
          domain: gp.goal.domain,
          goalText: gp.goal.goalText,
          progressNote: gp.progressNote ?? '',
          progressValue: gp.progressValue ?? gp.goal.currentProgress,
        };
      });

      return {
        date: s.scheduledAt.toLocaleDateString(),
        aiSummary: s.aiSummary ?? undefined,
        rawNotes: s.rawNotes ?? undefined,
        goalProgress: goalProgressItems,
      };
    });

    const domainMap: Record<string, string> = {
      'MOTOR': 'MOTOR',
      'FINE MOTOR': 'MOTOR',
      'GROSS MOTOR': 'MOTOR',
      'LANGUAGE': 'LANGUAGE',
      'SPEECH': 'LANGUAGE',
      'COMMUNICATION': 'LANGUAGE',
      'SOCIAL': 'SOCIAL',
      'EMOTIONAL': 'SOCIAL',
      'SOCIAL-EMOTIONAL': 'SOCIAL',
      'COGNITIVE': 'COGNITIVE',
      'ACADEMIC': 'COGNITIVE',
      'SENSORY': 'SENSORY',
      'ADAPTIVE': 'ADAPTIVE',
      'SELF-CARE': 'ADAPTIVE',
      'DAILY LIVING': 'ADAPTIVE',
    };

    const suggestedDomains = [...domains].map(
      (d) => domainMap[d] ?? d,
    ).filter((d, i, arr) => arr.indexOf(d) === i);

    const notesSummary = sessionSummaries
      .map((s) => s.aiSummary ?? s.rawNotes ?? '')
      .filter(Boolean)
      .join('; ')
      .substring(0, 1000);

    return {
      childAge: ageMonths,
      conditions: caseRecord.child.conditions.map((c) => c.conditionType),
      developmentalNotes: `Based on ${caseRecord.sessions.length} therapy session(s): ${notesSummary}`,
      suggestedDomains,
      contextData: {
        caseId,
        sessionIds,
        sessions: sessionSummaries,
      },
    };
  }

  // ─── IEP Goals ─────────────────────────────────────────────

  async getIEPGoals(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          select: { id: true, firstName: true, nickname: true },
        },
        ieps: {
          where: { status: 'ACTIVE' },
          include: {
            goals: {
              select: {
                id: true,
                domain: true,
                goalText: true,
                currentProgress: true,
                status: true,
                targetDate: true,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');

    const activeIep = caseRecord.ieps[0] ?? null;

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      child: caseRecord.child,
      iep: activeIep,
      goals: activeIep?.goals ?? [],
    };
  }

  async resolveIEPGoalsDataSource(
    caseId: string,
    goalIds: string[],
  ): Promise<DataSourceResult> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        child: {
          include: {
            conditions: true,
          },
        },
        ieps: {
          where: { status: 'ACTIVE' },
          include: {
            goals: {
              where: { id: { in: goalIds } },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) throw new NotFoundException('Case not found');

    const activeIep = caseRecord.ieps[0];
    if (!activeIep) throw new BadRequestException('No active IEP found for this case');

    const goals = activeIep.goals;
    if (goals.length === 0) throw new BadRequestException('No matching IEP goals found');

    const ageMonths = Math.round(
      (Date.now() - caseRecord.child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );

    const domainMap: Record<string, string> = {
      'Motor': 'MOTOR',
      'Fine Motor': 'MOTOR',
      'Gross Motor': 'MOTOR',
      'Language': 'LANGUAGE',
      'Speech': 'LANGUAGE',
      'Communication': 'LANGUAGE',
      'Social': 'SOCIAL',
      'Emotional': 'SOCIAL',
      'Social-Emotional': 'SOCIAL',
      'Cognitive': 'COGNITIVE',
      'Academic': 'COGNITIVE',
      'Sensory': 'SENSORY',
      'Adaptive': 'ADAPTIVE',
      'Self-Care': 'ADAPTIVE',
      'Daily Living': 'ADAPTIVE',
    };

    const suggestedDomains: string[] = [...new Set(
      goals.map((g) => domainMap[g.domain] ?? g.domain.toUpperCase()).filter(Boolean),
    )];

    const goalDescriptions = goals
      .map((g) => `[${g.domain}] ${g.goalText} (Progress: ${g.currentProgress}%, Status: ${g.status})`)
      .join('\n');

    return {
      childAge: ageMonths,
      conditions: caseRecord.child.conditions.map((c) => c.conditionType),
      developmentalNotes: `IEP Goals to target:\n${goalDescriptions}`,
      suggestedDomains,
      contextData: {
        caseId,
        iepId: activeIep.id,
        goals: goals.map((g) => ({
          id: g.id,
          domain: g.domain,
          goalText: g.goalText,
          currentProgress: g.currentProgress,
          status: g.status,
        })),
      },
    };
  }
}
