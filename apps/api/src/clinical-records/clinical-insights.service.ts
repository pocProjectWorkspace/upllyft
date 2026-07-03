import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import type {
  ClinicalTemplateSchema,
  ClinicalField,
  ClinicalInsights,
} from '../clinical-templates/clinical-types';
import { ClinicalRecordsService } from './clinical-records.service';

/**
 * Generates structured clinical insights from a captured assessment using
 * Anthropic Claude, and persists them on the ClinicalRecord for the therapist.
 * Insights are AI-assisted decision support — not a diagnosis — and require
 * professional review.
 */
@Injectable()
export class ClinicalInsightsService {
  private readonly logger = new Logger(ClinicalInsightsService.name);
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private recordsService: ClinicalRecordsService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) this.client = new Anthropic({ apiKey });
    // Dedicated var with a current default so we don't inherit a stale
    // ANTHROPIC_MODEL (the worksheet default 'claude-sonnet-4-20250514' is now
    // retired / 404s on the account).
    this.model =
      this.config.get<string>('ANTHROPIC_INSIGHTS_MODEL') || 'claude-sonnet-5';
  }

  async generate(caseId: string, recordId: string, userId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
      include: { template: { select: { name: true, schema: true, discipline: true } } },
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    const prefill = await this.recordsService.getPrefill(caseId, userId);
    const schema = record.template.schema as unknown as ClinicalTemplateSchema;
    const answers = (record.answers ?? {}) as Record<string, unknown>;
    const clientBlock = this.renderClientBlock(prefill);
    const capturedText = this.renderAnswers(schema, answers);

    const insights = this.client
      ? await this.generateWithClaude(record.template.name, record.template.discipline, clientBlock, capturedText).catch(
          (err) => {
            this.logger.warn(`Claude insights failed: ${err?.message}`);
            return this.fallback(capturedText);
          },
        )
      : this.fallback(capturedText);

    const updated = await this.prisma.clinicalRecord.update({
      where: { id: recordId },
      data: {
        insights: insights as any,
        insightsModel: this.client ? this.model : 'fallback',
        insightsGeneratedAt: new Date(),
      },
      select: { insights: true, insightsModel: true, insightsGeneratedAt: true },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CLINICAL_RECORD_INSIGHTS_GENERATED',
        entityType: 'ClinicalRecord',
        entityId: recordId,
      },
    });

    return updated;
  }

  private async generateWithClaude(
    templateName: string,
    discipline: string,
    clientBlock: string,
    capturedText: string,
  ): Promise<ClinicalInsights> {
    const system = `You are a senior clinical supervisor supporting a ${discipline.toLowerCase().replace(/_/g, ' ')} therapist at a paediatric neurodevelopmental centre. You analyse a completed assessment and produce concise, practical insights to help the therapist interpret findings and plan intervention.

Rules:
- Use ONLY the information provided. Never invent scores, diagnoses, or history.
- Do not state a diagnosis; describe patterns, strengths and needs.
- Flag safeguarding/medical urgency ONLY if clearly indicated by the content.
- Be specific and clinically useful; avoid generic filler.
- Respond with ONLY a valid JSON object (no markdown, no prose) matching this shape:
{
  "summary": string,                 // 2-4 sentence clinical synthesis
  "keyFindings": string[],           // notable findings across domains
  "strengths": string[],
  "concerns": string[],              // areas needing attention
  "riskFlags": string[],             // safeguarding/urgent items; [] if none
  "recommendations": string[],       // concrete next steps / therapy focus
  "suggestedGoals": [{ "domain": string, "goal": string }],  // SMART-style
  "parentGuidance": string[]         // home strategies for caregivers
}`;

    const user = `ASSESSMENT: ${templateName}

CLIENT & CASE INFORMATION:
${clientBlock}

CAPTURED ASSESSMENT DATA:
${capturedText}`;

    const response = await this.client!.messages.create({
      model: this.model,
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text from Claude');

    const parsed = this.parseJson(textBlock.text);
    return this.normalize(parsed);
  }

  private parseJson(text: string): any {
    let t = text.trim();
    // strip ```json ... ``` fences if present
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    // otherwise slice to the outermost object
    if (!t.startsWith('{')) {
      const s = t.indexOf('{');
      const e = t.lastIndexOf('}');
      if (s !== -1 && e !== -1) t = t.slice(s, e + 1);
    }
    return JSON.parse(t);
  }

  private normalize(o: any): ClinicalInsights {
    const arr = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
    return {
      summary: typeof o?.summary === 'string' ? o.summary : '',
      keyFindings: arr(o?.keyFindings),
      strengths: arr(o?.strengths),
      concerns: arr(o?.concerns),
      riskFlags: arr(o?.riskFlags),
      recommendations: arr(o?.recommendations),
      suggestedGoals: Array.isArray(o?.suggestedGoals)
        ? o.suggestedGoals
            .filter((g: any) => g && (g.goal || g.domain))
            .map((g: any) => ({ domain: String(g.domain ?? ''), goal: String(g.goal ?? '') }))
        : [],
      parentGuidance: arr(o?.parentGuidance),
      disclaimer:
        'AI-assisted insights for clinician decision support — review and verify before use. Not a diagnosis.',
    };
  }

  private fallback(capturedText: string): ClinicalInsights {
    return {
      summary:
        'AI insights are unavailable (no Anthropic API key configured). The captured assessment data is shown below for manual review.',
      keyFindings: capturedText ? capturedText.split('\n').filter((l) => l.startsWith('- ')).slice(0, 8).map((l) => l.replace(/^- /, '')) : [],
      strengths: [],
      concerns: [],
      riskFlags: [],
      recommendations: [],
      suggestedGoals: [],
      parentGuidance: [],
      disclaimer: 'Fallback (no AI). Configure ANTHROPIC_API_KEY to enable insights.',
    };
  }

  // ── rendering (mirrors the report service) ──
  private renderClientBlock(prefill: Record<string, unknown>): string {
    const lines: [string, unknown][] = [
      ['Name', prefill.clientFullName],
      ['Age', prefill.age],
      ['Gender', prefill.gender],
      ['Primary language(s)', prefill.primaryLanguages],
      ['School / organisation', prefill.schoolOrganisation],
      ['Referral source', prefill.referralSource],
      ['Diagnosis', prefill.diagnosis],
    ];
    return lines.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${this.stringify(v)}`).join('\n');
  }

  private renderAnswers(schema: ClinicalTemplateSchema, answers: Record<string, unknown>): string {
    const blocks: string[] = [];
    for (const section of schema.sections ?? []) {
      if (section.id === 'identifiers' || section.id === 'signoff') continue;
      const lines = (section.fields ?? [])
        .map((f) => this.renderField(f, answers[f.id]))
        .filter(Boolean);
      if (lines.length) blocks.push(`## ${section.title}\n${lines.join('\n')}`);
    }
    return blocks.join('\n\n');
  }

  private renderField(field: ClinicalField, value: unknown): string | null {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
    return `- ${field.label}: ${this.stringify(value)}`;
  }

  private stringify(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? this.rowToText(v) : String(v))).join('; ');
    if (typeof value === 'object') return this.rowToText(value);
    return String(value);
  }

  private rowToText(row: any): string {
    if (!row || typeof row !== 'object') return String(row);
    return Object.entries(row).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`).join(', ');
  }
}
