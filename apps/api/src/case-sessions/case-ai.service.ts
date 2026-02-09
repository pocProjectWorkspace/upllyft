import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SessionNoteFormat } from '@prisma/client';

export interface SessionSummaryInput {
  rawNotes: string;
  format: SessionNoteFormat;
  sessionType?: string;
  duration?: number;
  childName?: string;
  childAge?: string;
  goalsAddressed?: Array<{ goalText: string; domain: string; progressValue?: number }>;
  structuredNotes?: {
    activities?: string[];
    observations?: string;
    parentFeedback?: string;
    homeworkAssigned?: string;
    nextSessionPlan?: string;
  };
}

export interface SessionSummaryResult {
  summary: string;
  format: SessionNoteFormat;
  clinicalTermsEnhanced: boolean;
}

@Injectable()
export class CaseAiService {
  private readonly logger = new Logger(CaseAiService.name);
  private openai: OpenAI | null = null;
  private readonly modelName: string;

  constructor(private configService: ConfigService) {
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
   * Generate a professional clinical session summary from raw therapist notes.
   */
  async generateSessionSummary(input: SessionSummaryInput): Promise<SessionSummaryResult> {
    if (!input.rawNotes?.trim()) {
      throw new BadRequestException('Raw notes are required to generate a summary');
    }

    if (!this.isAvailable) {
      return {
        summary: this.generateFallbackSummary(input),
        format: input.format,
        clinicalTermsEnhanced: false,
      };
    }

    const systemPrompt = this.buildSystemPrompt(input.format);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const params: any = {
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 1500,
      };

      // GPT-5 doesn't support temperature
      if (!this.modelName.startsWith('gpt-5')) {
        params.temperature = 0.3;
      }

      const response = await this.openai!.chat.completions.create(params);
      const summary = response.choices?.[0]?.message?.content?.trim();

      if (!summary) {
        return {
          summary: this.generateFallbackSummary(input),
          format: input.format,
          clinicalTermsEnhanced: false,
        };
      }

      return {
        summary,
        format: input.format,
        clinicalTermsEnhanced: true,
      };
    } catch (err) {
      this.logger.error('AI session summary generation failed', err);
      return {
        summary: this.generateFallbackSummary(input),
        format: input.format,
        clinicalTermsEnhanced: false,
      };
    }
  }

  /**
   * Enhance casual language to clinical terminology.
   */
  async enhanceClinicalLanguage(text: string): Promise<string> {
    if (!this.isAvailable || !text?.trim()) return text;

    try {
      const params: any = {
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: [
              'You are a clinical documentation specialist.',
              'Transform the following informal therapist notes into professional clinical language.',
              'Preserve all factual content and observations.',
              'Use appropriate clinical terminology (e.g., "the child demonstrated difficulty with" instead of "kid had trouble with").',
              'Maintain a professional, objective tone.',
              'Do NOT add information that is not present in the original notes.',
              'Return only the enhanced text, no explanations.',
            ].join(' '),
          },
          { role: 'user', content: text.slice(0, 3000) },
        ],
        max_completion_tokens: 1000,
      };

      if (!this.modelName.startsWith('gpt-5')) {
        params.temperature = 0.2;
      }

      const response = await this.openai!.chat.completions.create(params);
      return response.choices?.[0]?.message?.content?.trim() || text;
    } catch (err) {
      this.logger.error('Clinical language enhancement failed', err);
      return text;
    }
  }

  private buildSystemPrompt(format: SessionNoteFormat): string {
    const baseInstructions = [
      'You are a clinical documentation specialist for pediatric therapy.',
      'Transform raw therapist session notes into a structured professional summary.',
      'Use appropriate clinical terminology throughout.',
      'Be concise but thorough. Do not fabricate information not present in the notes.',
    ];

    switch (format) {
      case 'SOAP':
        return [
          ...baseInstructions,
          'Format the summary using the SOAP format:',
          '**Subjective**: Patient/caregiver reports, complaints, history relevant to session.',
          '**Objective**: Observable findings, measurements, test results, therapist observations.',
          '**Assessment**: Clinical interpretation of findings, progress toward goals.',
          '**Plan**: Next steps, treatment modifications, follow-up, home program.',
        ].join('\n');

      case 'DAP':
        return [
          ...baseInstructions,
          'Format the summary using the DAP format:',
          '**Data**: Objective observations, what was done, how the patient responded.',
          '**Assessment**: Therapist interpretation, progress, clinical reasoning.',
          '**Plan**: Goals for next session, modifications, recommendations.',
        ].join('\n');

      case 'NARRATIVE':
        return [
          ...baseInstructions,
          'Write a professional narrative summary in paragraph form.',
          'Include: session overview, interventions used, patient response, progress observations, and plan.',
        ].join('\n');

      default:
        return baseInstructions.join('\n');
    }
  }

  private buildUserPrompt(input: SessionSummaryInput): string {
    const parts: string[] = [];

    if (input.childName || input.childAge) {
      parts.push(`Patient: ${input.childName || 'N/A'}, Age: ${input.childAge || 'N/A'}`);
    }
    if (input.sessionType) {
      parts.push(`Session Type: ${input.sessionType}`);
    }
    if (input.duration) {
      parts.push(`Duration: ${input.duration} minutes`);
    }

    parts.push('');
    parts.push('--- Raw Session Notes ---');
    parts.push(input.rawNotes);

    if (input.structuredNotes) {
      const sn = input.structuredNotes;
      parts.push('');
      parts.push('--- Additional Structured Data ---');
      if (sn.activities?.length) parts.push(`Activities: ${sn.activities.join(', ')}`);
      if (sn.observations) parts.push(`Observations: ${sn.observations}`);
      if (sn.parentFeedback) parts.push(`Parent Feedback: ${sn.parentFeedback}`);
      if (sn.homeworkAssigned) parts.push(`Homework Assigned: ${sn.homeworkAssigned}`);
      if (sn.nextSessionPlan) parts.push(`Next Session Plan: ${sn.nextSessionPlan}`);
    }

    if (input.goalsAddressed?.length) {
      parts.push('');
      parts.push('--- Goals Addressed ---');
      input.goalsAddressed.forEach((g, i) => {
        parts.push(
          `${i + 1}. [${g.domain}] ${g.goalText}${g.progressValue !== undefined ? ` (Progress: ${g.progressValue}%)` : ''}`,
        );
      });
    }

    parts.push('');
    parts.push('Generate the professional clinical summary now:');

    return parts.join('\n');
  }

  private generateFallbackSummary(input: SessionSummaryInput): string {
    const parts: string[] = [];

    if (input.format === 'SOAP') {
      parts.push('**Subjective**: See raw notes.');
      parts.push(`**Objective**: Session conducted${input.duration ? ` (${input.duration} min)` : ''}.`);
      parts.push('**Assessment**: Refer to goal progress entries.');
      parts.push('**Plan**: See next session plan.');
    } else if (input.format === 'DAP') {
      parts.push(`**Data**: ${input.rawNotes.slice(0, 200)}...`);
      parts.push('**Assessment**: Refer to goal progress entries.');
      parts.push('**Plan**: See next session plan.');
    } else {
      parts.push(input.rawNotes.slice(0, 500));
    }

    return parts.join('\n\n');
  }
}
