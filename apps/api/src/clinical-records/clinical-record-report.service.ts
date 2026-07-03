import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CaseDocumentType } from '@prisma/client';
import OpenAI from 'openai';
import type {
  ClinicalTemplateSchema,
  ClinicalSection,
  ClinicalField,
} from '../clinical-templates/clinical-types';
import { ClinicalRecordsService } from './clinical-records.service';

/**
 * Generates a narrative assessment/report document from a captured
 * ClinicalRecord. Pre-populates client + case information (profile + intake)
 * and feeds the captured answers to the LLM, mirroring the existing case
 * report engine. Falls back to a deterministic render when no API key is set.
 * The result is persisted as a CaseDocument and linked back onto the record.
 */
@Injectable()
export class ClinicalRecordReportService {
  private readonly logger = new Logger(ClinicalRecordReportService.name);
  private openai: OpenAI | null = null;
  private readonly modelName: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private recordsService: ClinicalRecordsService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({ apiKey });
    }
    this.modelName = this.config.get<string>('AI_MODEL', 'gpt-5');
  }

  async generate(
    caseId: string,
    recordId: string,
    userId: string,
    audience: 'PROFESSIONAL' | 'PARENT' = 'PROFESSIONAL',
    additionalContext?: string,
  ) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, caseId },
      include: {
        template: { select: { name: true, schema: true, discipline: true } },
      },
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    // Client + case information (pre-populated from profile + intake).
    const prefill = await this.recordsService.getPrefill(caseId, userId);

    const schema = record.template.schema as unknown as ClinicalTemplateSchema;
    const answers = (record.answers ?? {}) as Record<string, unknown>;
    const capturedText = this.renderAnswers(schema, answers);
    const clientBlock = this.renderClientBlock(prefill);

    const content = this.openai
      ? await this.generateWithAi(
          record.template.name,
          clientBlock,
          capturedText,
          audience,
          additionalContext,
        ).catch((err) => {
          this.logger.warn(`AI report generation failed: ${err?.message}`);
          return this.buildFallback(record.template.name, clientBlock, capturedText);
        })
      : this.buildFallback(record.template.name, clientBlock, capturedText);

    const doc = await this.prisma.caseDocument.create({
      data: {
        caseId,
        type: this.documentType(record.activityType),
        title: `${record.title} — Report`,
        content,
        audience: audience as any,
        createdById: userId,
      },
    });

    await this.prisma.clinicalRecord.update({
      where: { id: recordId },
      data: { reportDocumentId: doc.id },
    });

    await this.prisma.caseAuditLog.create({
      data: {
        caseId,
        userId,
        action: 'CLINICAL_RECORD_REPORT_GENERATED',
        entityType: 'CaseDocument',
        entityId: doc.id,
      },
    });

    return { document: doc, content };
  }

  // ─── Rendering helpers ─────────────────────────────────────

  private renderClientBlock(prefill: Record<string, unknown>): string {
    const lines = [
      ['Name', prefill.clientFullName],
      ['MRN', prefill.clientMrn],
      ['Date of birth', prefill.dateOfBirth],
      ['Age', prefill.age],
      ['Gender', prefill.gender],
      ['Parent / caregiver', prefill.parentCaregiver],
      ['Primary language(s)', prefill.primaryLanguages],
      ['School / organisation', prefill.schoolOrganisation],
      ['Referral source', prefill.referralSource],
      ['Diagnosis', prefill.diagnosis],
      ['Prepared by', prefill.recordAuthor],
    ];
    return lines
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${this.stringify(v)}`)
      .join('\n');
  }

  private renderAnswers(
    schema: ClinicalTemplateSchema,
    answers: Record<string, unknown>,
  ): string {
    const blocks: string[] = [];
    for (const section of schema.sections ?? []) {
      // The identifier and sign-off sections are covered by the client block.
      if (section.id === 'identifiers' || section.id === 'signoff') continue;
      const fieldLines = (section.fields ?? [])
        .map((f) => this.renderField(f, answers[f.id]))
        .filter(Boolean);
      if (fieldLines.length) {
        blocks.push(`## ${section.title}\n${fieldLines.join('\n')}`);
      }
    }
    return blocks.join('\n\n');
  }

  private renderField(field: ClinicalField, value: unknown): string | null {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
      return null;
    }
    return `- ${field.label}: ${this.stringify(value)}`;
  }

  private stringify(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'object' ? this.rowToText(v) : String(v)))
        .join('; ');
    }
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') return this.rowToText(value);
    return String(value);
  }

  private rowToText(row: any): string {
    if (!row || typeof row !== 'object') return String(row);
    return Object.entries(row)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }

  private documentType(activityType: string): CaseDocumentType {
    switch (activityType) {
      case 'ASSESSMENT':
      case 'MDT_REVIEW':
        return CaseDocumentType.ASSESSMENT;
      case 'PROGRESS_REVIEW':
        return CaseDocumentType.PROGRESS_REPORT;
      case 'DISCHARGE':
        return CaseDocumentType.DISCHARGE_SUMMARY;
      default:
        return CaseDocumentType.REPORT;
    }
  }

  private async generateWithAi(
    templateName: string,
    clientBlock: string,
    capturedText: string,
    audience: 'PROFESSIONAL' | 'PARENT',
    additionalContext?: string,
  ): Promise<string> {
    const audienceGuidance =
      audience === 'PARENT'
        ? 'Write for the parent/caregiver in warm, plain, jargon-free language.'
        : 'Write for a professional clinical audience using appropriate clinical terminology.';

    const prompt = `You are a clinical documentation assistant for a neurodevelopmental therapy centre. Draft a well-structured "${templateName}" as a formal narrative report using ONLY the information provided. Do not invent findings, scores, or diagnoses that are not present. Where information is missing, omit that section rather than fabricating. ${audienceGuidance}

CLIENT & CASE INFORMATION:
${clientBlock}

CAPTURED CLINICAL INFORMATION:
${capturedText}
${additionalContext ? `\nADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Produce the report with clear headed sections (e.g. Background, Assessment Findings, Summary, Recommendations) as appropriate to the captured content. End with a professional sign-off line. A qualified professional will review before release.`;

    const completion = await this.openai!.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      this.buildFallback(templateName, clientBlock, capturedText)
    );
  }

  private buildFallback(
    templateName: string,
    clientBlock: string,
    capturedText: string,
  ): string {
    return [
      templateName.toUpperCase(),
      '',
      clientBlock,
      '',
      capturedText,
      '',
      '_This draft was assembled from the captured record and must be reviewed and signed by a qualified professional before release._',
    ].join('\n');
  }
}
