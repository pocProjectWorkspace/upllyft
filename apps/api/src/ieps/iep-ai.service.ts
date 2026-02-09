import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

export interface GeneratedIEPGoal {
  domain: string;
  goalText: string;
  targetDate?: string;
  linkedIndicators?: string[];
}

export interface GeneratedIEP {
  goals: GeneratedIEPGoal[];
  accommodations: string[];
  suggestedServices: Array<{
    type: string;
    frequency: string;
    duration: string;
  }>;
}

export interface GoalSuggestion {
  domain: string;
  goalText: string;
  rationale: string;
}

@Injectable()
export class IEPAiService {
  private readonly logger = new Logger(IEPAiService.name);
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
   * Generate an IEP draft from a screening assessment.
   */
  async generateIEPFromScreening(
    caseId: string,
    assessmentId: string,
    additionalContext?: string,
  ): Promise<GeneratedIEP> {
    // Fetch assessment data
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: {
          select: {
            firstName: true,
            dateOfBirth: true,
            gender: true,
            conditions: true,
          },
        },
        responses: true,
        reports: {
          where: { reportType: 'DETAILED' },
          take: 1,
        },
      },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    if (!this.isAvailable) {
      return this.generateFallbackIEP(assessment);
    }

    const childAge = this.calculateAge(assessment.child.dateOfBirth);
    const conditions = assessment.child.conditions
      .map((c) => c.conditionType + (c.severity ? ` (${c.severity})` : ''))
      .join(', ');
    const flaggedDomains = assessment.flaggedDomains.join(', ');
    const domainScores = assessment.domainScores
      ? JSON.stringify(assessment.domainScores)
      : 'N/A';

    const prompt = [
      {
        role: 'system' as const,
        content: [
          'You are a pediatric therapy IEP specialist.',
          'Generate a comprehensive Individualized Education Program based on developmental screening results.',
          'Create SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound).',
          'Goals should be clinically appropriate for the child\'s age and developmental profile.',
          '',
          'Return valid JSON matching this structure:',
          '{',
          '  "goals": [{ "domain": "string", "goalText": "string", "targetDate": "YYYY-MM-DD", "linkedIndicators": ["string"] }],',
          '  "accommodations": ["string"],',
          '  "suggestedServices": [{ "type": "string", "frequency": "string", "duration": "string" }]',
          '}',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: [
          `Child: ${assessment.child.firstName}, Age: ${childAge}, Gender: ${assessment.child.gender}`,
          `Diagnoses: ${conditions || 'None documented'}`,
          `Flagged Domains: ${flaggedDomains || 'None'}`,
          `Domain Scores: ${domainScores}`,
          `Assessment Age Group: ${assessment.ageGroup}`,
          '',
          ...(assessment.reports[0]?.v2Content
            ? [`Detailed Report Data: ${JSON.stringify(assessment.reports[0].v2Content).slice(0, 3000)}`]
            : []),
          '',
          ...(additionalContext ? [`Additional Clinical Context: ${additionalContext}`] : []),
          '',
          'Generate an IEP with 4-8 SMART goals covering flagged domains, appropriate accommodations, and recommended therapy services.',
        ].join('\n'),
      },
    ];

    try {
      const params: any = {
        model: this.modelName,
        messages: prompt,
        max_completion_tokens: 2000,
        response_format: { type: 'json_object' },
      };
      if (!this.modelName.startsWith('gpt-5')) {
        params.temperature = 0.3;
      }

      const response = await this.openai!.chat.completions.create(params);
      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) return this.generateFallbackIEP(assessment);

      const parsed = this.safeParseJSON<GeneratedIEP>(content);
      if (!parsed?.goals?.length) return this.generateFallbackIEP(assessment);

      return parsed;
    } catch (err) {
      this.logger.error('AI IEP generation failed', err);
      return this.generateFallbackIEP(assessment);
    }
  }

  /**
   * Suggest SMART goals for a specific domain.
   */
  async suggestGoals(
    domain: string,
    childAge?: string,
    assessmentId?: string,
    count = 5,
  ): Promise<GoalSuggestion[]> {
    if (!this.isAvailable) {
      return this.getFallbackGoalSuggestions(domain, count);
    }

    let assessmentContext = '';
    if (assessmentId) {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { domainScores: true, flaggedDomains: true, ageGroup: true },
      });
      if (assessment) {
        assessmentContext = `Assessment Data - Age Group: ${assessment.ageGroup}, Domain Scores: ${JSON.stringify(assessment.domainScores)}, Flagged: ${assessment.flaggedDomains.join(', ')}`;
      }
    }

    const prompt = [
      {
        role: 'system' as const,
        content: [
          'You are a pediatric therapy goal-writing specialist.',
          'Generate evidence-based SMART goals for developmental therapy.',
          'Each goal must be Specific, Measurable, Achievable, Relevant, and Time-bound.',
          '',
          'Return valid JSON:',
          '{ "goals": [{ "domain": "string", "goalText": "string", "rationale": "string" }] }',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: [
          `Domain: ${domain}`,
          ...(childAge ? [`Child Age: ${childAge}`] : []),
          ...(assessmentContext ? [assessmentContext] : []),
          '',
          `Generate ${count} SMART goals for the ${domain} domain with clinical rationale for each.`,
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
      if (!this.modelName.startsWith('gpt-5')) {
        params.temperature = 0.4;
      }

      const response = await this.openai!.chat.completions.create(params);
      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) return this.getFallbackGoalSuggestions(domain, count);

      const parsed = this.safeParseJSON<{ goals: GoalSuggestion[] }>(content);
      return parsed?.goals?.slice(0, count) || this.getFallbackGoalSuggestions(domain, count);
    } catch (err) {
      this.logger.error('AI goal suggestion failed', err);
      return this.getFallbackGoalSuggestions(domain, count);
    }
  }

  // ─── HELPERS ───────────────────────────────────────────

  private generateFallbackIEP(assessment: any): GeneratedIEP {
    const domains = assessment.flaggedDomains?.length
      ? assessment.flaggedDomains
      : ['communication', 'motor', 'social-emotional'];

    return {
      goals: domains.map((domain: string) => ({
        domain,
        goalText: `Improve ${domain} skills as measured by standardized assessment within 6 months.`,
        linkedIndicators: [],
      })),
      accommodations: [
        'Extended time for activities',
        'Visual supports and schedules',
        'Sensory breaks as needed',
      ],
      suggestedServices: [
        { type: 'Occupational Therapy', frequency: '2x per week', duration: '45 minutes' },
        { type: 'Speech-Language Therapy', frequency: '1x per week', duration: '30 minutes' },
      ],
    };
  }

  private getFallbackGoalSuggestions(domain: string, count: number): GoalSuggestion[] {
    const templates: Record<string, GoalSuggestion[]> = {
      'communication': [
        { domain, goalText: 'Will use 2-3 word phrases to request items in 4 out of 5 opportunities.', rationale: 'Expressive language building block.' },
        { domain, goalText: 'Will follow 2-step verbal directions without visual cues in 80% of trials.', rationale: 'Receptive language development.' },
        { domain, goalText: 'Will engage in 3 conversational exchanges on a topic with minimal prompting.', rationale: 'Social communication skill.' },
      ],
      'motor': [
        { domain, goalText: 'Will demonstrate age-appropriate pencil grasp during tabletop activities for 5 minutes.', rationale: 'Fine motor development for academic readiness.' },
        { domain, goalText: 'Will independently navigate playground equipment appropriate for age.', rationale: 'Gross motor confidence and coordination.' },
        { domain, goalText: 'Will cut along a curved line with scissors within 1/4 inch accuracy.', rationale: 'Bilateral coordination and fine motor control.' },
      ],
      'social-emotional': [
        { domain, goalText: 'Will identify and label 4 basic emotions in self and others.', rationale: 'Emotional awareness foundation.' },
        { domain, goalText: 'Will engage in cooperative play with a peer for 10 minutes with no more than 1 prompt.', rationale: 'Social interaction development.' },
        { domain, goalText: 'Will use a calming strategy when frustrated in 3 out of 4 opportunities.', rationale: 'Self-regulation skill building.' },
      ],
    };

    const suggestions = templates[domain] || [
      { domain, goalText: `Will demonstrate measurable improvement in ${domain} skills within 6 months.`, rationale: 'General developmental progression.' },
      { domain, goalText: `Will achieve age-appropriate ${domain} milestones as assessed quarterly.`, rationale: 'Normative development tracking.' },
    ];

    return suggestions.slice(0, count);
  }

  private calculateAge(dob: Date): string {
    const now = new Date();
    const totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (totalMonths < 24) return `${totalMonths} months`;
    return `${Math.floor(totalMonths / 12)} years ${totalMonths % 12} months`;
  }

  private safeParseJSON<T>(raw: string): T | null {
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '');
      return JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return null;
    }
  }
}
