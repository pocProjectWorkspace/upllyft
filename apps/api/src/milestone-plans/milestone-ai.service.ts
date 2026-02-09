import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

export interface GeneratedMilestone {
  domain: string;
  description: string;
  expectedAge: string;
  targetDate?: string;
}

@Injectable()
export class MilestoneAiService {
  private readonly logger = new Logger(MilestoneAiService.name);
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

  async generateMilestonesFromScreening(
    assessmentId: string,
    additionalContext?: string,
  ): Promise<GeneratedMilestone[]> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: {
          select: { firstName: true, dateOfBirth: true, gender: true, conditions: true },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (!this.isAvailable) {
      return this.getFallbackMilestones(assessment);
    }

    const childAge = this.calculateAge(assessment.child.dateOfBirth);
    const conditions = assessment.child.conditions.map((c) => c.conditionType).join(', ');

    const prompt = [
      {
        role: 'system' as const,
        content: [
          'You are a pediatric developmental specialist.',
          'Generate age-appropriate developmental milestones based on screening results.',
          'Each milestone should be specific, observable, and aligned with normative developmental expectations.',
          '',
          'Return valid JSON:',
          '{ "milestones": [{ "domain": "string", "description": "string", "expectedAge": "string" }] }',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: [
          `Child Age: ${childAge}, Gender: ${assessment.child.gender}`,
          `Diagnoses: ${conditions || 'None'}`,
          `Flagged Domains: ${assessment.flaggedDomains.join(', ') || 'None'}`,
          `Domain Scores: ${JSON.stringify(assessment.domainScores)}`,
          ...(additionalContext ? [`Context: ${additionalContext}`] : []),
          '',
          'Generate 8-12 developmental milestones covering flagged domains, with realistic age expectations.',
        ].join('\n'),
      },
    ];

    try {
      const params: any = {
        model: this.modelName,
        messages: prompt,
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' },
      };
      if (!this.modelName.startsWith('gpt-5')) params.temperature = 0.3;

      const response = await this.openai!.chat.completions.create(params);
      const content = response.choices?.[0]?.message?.content?.trim();
      if (!content) return this.getFallbackMilestones(assessment);

      const parsed = this.safeParseJSON<{ milestones: GeneratedMilestone[] }>(content);
      return parsed?.milestones || this.getFallbackMilestones(assessment);
    } catch (err) {
      this.logger.error('AI milestone generation failed', err);
      return this.getFallbackMilestones(assessment);
    }
  }

  private getFallbackMilestones(assessment: any): GeneratedMilestone[] {
    const domains = assessment.flaggedDomains?.length
      ? assessment.flaggedDomains
      : ['communication', 'motor', 'social-emotional'];

    const milestoneTemplates: Record<string, GeneratedMilestone[]> = {
      communication: [
        { domain: 'communication', description: 'Uses 50+ words spontaneously', expectedAge: '18-24 months' },
        { domain: 'communication', description: 'Combines 2 words into phrases', expectedAge: '24-30 months' },
        { domain: 'communication', description: 'Follows 2-step directions', expectedAge: '24-36 months' },
      ],
      motor: [
        { domain: 'motor', description: 'Stacks 6+ blocks', expectedAge: '18-24 months' },
        { domain: 'motor', description: 'Draws a circle', expectedAge: '30-36 months' },
        { domain: 'motor', description: 'Cuts with scissors on a line', expectedAge: '36-48 months' },
      ],
      'social-emotional': [
        { domain: 'social-emotional', description: 'Engages in parallel play', expectedAge: '24-30 months' },
        { domain: 'social-emotional', description: 'Takes turns with assistance', expectedAge: '30-36 months' },
        { domain: 'social-emotional', description: 'Identifies basic emotions', expectedAge: '36-48 months' },
      ],
    };

    const results: GeneratedMilestone[] = [];
    for (const domain of domains) {
      const items = milestoneTemplates[domain] || [
        { domain, description: `Demonstrate age-appropriate ${domain} skills`, expectedAge: 'Age-appropriate' },
      ];
      results.push(...items);
    }
    return results;
  }

  private calculateAge(dob: Date): string {
    const totalMonths =
      (new Date().getFullYear() - dob.getFullYear()) * 12 +
      (new Date().getMonth() - dob.getMonth());
    if (totalMonths < 24) return `${totalMonths} months`;
    return `${Math.floor(totalMonths / 12)} years ${totalMonths % 12} months`;
  }

  private safeParseJSON<T>(raw: string): T | null {
    try {
      return JSON.parse(raw.replace(/```json\s*/g, '').replace(/```/g, ''));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) { try { return JSON.parse(match[0]); } catch {} }
      return null;
    }
  }
}
