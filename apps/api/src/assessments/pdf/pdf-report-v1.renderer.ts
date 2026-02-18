import { PdfBuilder } from './pdf-helpers';
import type { ReportData } from '../report-generator.service';

const FRAMEWORK_PARAGRAPHS = [
  'Upllyft Fusion Milestones Framework (UFMF v2.0) is a multi-domain developmental screening and functional formulation framework designed to identify strengths, emerging risks, and support needs across the full spectrum of neurodivergence. It organizes caregiver- and self-reported observations into recognized neurodevelopmental domains (including motor, language, cognition, social-emotional, adaptive functioning, sensory processing, and vision/hearing) and evaluates these against age-anchored developmental expectations.',
  'UFMF v2.0 is explicitly aligned with international diagnostic and functioning standards. Diagnostic classification remains the responsibility of qualified clinicians using established systems such as ICD-11 (WHO) and DSM-5-TR (APA). Functional interpretation within the framework is consistent with the ICF, emphasizing how observed patterns affect daily activities, participation, and contextual support needs.',
  'The framework integrates three complementary layers: (1) developmental milestone and skill mapping across domains; (2) synthesis of functional impact on everyday life, learning, and independence; and (3) non-diagnostic clinical hypothesis links that explain how observed patterns may relate to known neurodevelopmental mechanisms.',
  'All UFMF v2.0 outputs are provided as clinical decision-support and require professional judgment. Results are expressed using screening-appropriate language and include confidence indicators to support responsible interpretation.',
];

const DISCLAIMER_TEXT =
  'Important Note: This is a screening tool, not a diagnostic assessment. Children develop at different rates. This report highlights patterns and areas that may benefit from extra support. Please consult with a healthcare professional for a comprehensive evaluation.';

/**
 * Render a V1 Assessment PDF (Summary or Detailed) using PDFKit.
 */
export async function renderV1Report(
  reportData: ReportData,
  chartBuffer: Buffer,
  reportType: 'SUMMARY' | 'DETAILED',
  helpers: {
    formatDomainName: (domainId: string) => string;
    getInterpretation: (riskIndex: number, domainName: string) => string;
    calculateAge: (dob: Date) => string;
  },
): Promise<Buffer> {
  const {
    assessment,
    child,
    domainScores,
    responses,
    questionnaire,
    overallScore,
    recommendations,
  } = reportData;

  const pdf = new PdfBuilder();

  // ── Overall status ──────────────────────────────────────────────────
  let overallStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (overallScore >= 0.46) overallStatus = 'RED';
  else if (overallScore >= 0.30) overallStatus = 'YELLOW';

  const statusColor =
    overallStatus === 'GREEN'
      ? '#22c55e'
      : overallStatus === 'YELLOW'
        ? '#eab308'
        : '#ef4444';

  const statusLabel =
    overallStatus === 'GREEN'
      ? 'On Track'
      : overallStatus === 'YELLOW'
        ? 'Monitor'
        : 'Needs Attention';

  const dateStr = new Date(
    assessment.completedAt || assessment.createdAt,
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Header ──────────────────────────────────────────────────────────
  pdf.reportHeader(
    'Developmental Assessment Report',
    'Upllyft Fusion Milestones Framework (UFMF v2.0)',
    `Generated on ${dateStr}`,
  );

  // ── Child Info Grid ─────────────────────────────────────────────────
  pdf.infoGrid('Child Information', [
    { label: 'Child Name', value: child.firstName || child.name || '' },
    { label: 'Age', value: helpers.calculateAge(child.dateOfBirth) },
    {
      label: 'Assessment Date',
      value: new Date(
        assessment.completedAt || assessment.createdAt,
      ).toLocaleDateString(),
    },
    { label: 'Age Group', value: questionnaire.displayName || '' },
  ]);

  // ── Overall Score Box ───────────────────────────────────────────────
  pdf.scoreBox(
    'Overall Assessment Score',
    `${(overallScore * 100).toFixed(0)}%`,
    statusLabel,
    statusColor,
  );

  // ── Chart ───────────────────────────────────────────────────────────
  pdf.chartImage(chartBuffer);

  // ── Disclaimer ──────────────────────────────────────────────────────
  pdf.disclaimerBox(DISCLAIMER_TEXT);

  // ── Framework Description ───────────────────────────────────────────
  pdf.frameworkBox('About This Framework \u2014 UFMF v2.0', FRAMEWORK_PARAGRAPHS);

  // ── Domain Breakdowns ───────────────────────────────────────────────
  const domains = Object.keys(domainScores);
  for (const domainId of domains) {
    const domainData = (domainScores as any)[domainId];
    const domainName = helpers.formatDomainName(domainId);
    const interpretation = helpers.getInterpretation(domainData.riskIndex, domainName);

    pdf.domainCard(
      domainName,
      domainData.status,
      `${(domainData.riskIndex * 100).toFixed(0)}%`,
      interpretation,
    );

    // Detailed report: include Q&A per domain
    if (reportType === 'DETAILED') {
      const domainResponses = responses.filter((r) => r.domain === domainId);
      if (domainResponses.length > 0) {
        pdf.mutedText('Questions & Responses');
        pdf.moveDown(0.3);

        for (const response of domainResponses) {
          const domain = questionnaire.domains.find(
            (d: any) => d.id === domainId,
          );
          const allQuestions = [
            ...(domain?.tier1 || []),
            ...(domain?.tier2 || []),
          ];
          const question = allQuestions.find(
            (q: any) => q.id === response.questionId,
          );
          if (question) {
            pdf.questionItem(
              question.question,
              response.answer.replace('_', ' '),
              question.whyWeAsk,
            );
          }
        }
      }
    }
  }

  // ── Recommendations ─────────────────────────────────────────────────
  if (recommendations.length > 0) {
    pdf.recommendationsBox('Recommendations', recommendations);
  }

  // ── Footer ──────────────────────────────────────────────────────────
  pdf.footer([
    'Upllyft \u2014 Supporting developmental milestones',
    'This report was generated using the Upllyft Fusion Milestones Framework (UFMF v2.0)',
    'For questions or concerns, please consult with your healthcare provider or therapist.',
  ]);

  return pdf.toBuffer();
}
