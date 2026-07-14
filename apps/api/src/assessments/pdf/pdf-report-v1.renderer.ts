import { PdfBuilder } from './pdf-helpers';
import type { ReportData } from '../report-generator.service';

// PROVENANCE MUST MATCH THE ITEM BANK. This previously claimed the instrument was
// "adapted from ... the ASQ-3 developmental screening methodology". Not one of the
// 641 items in src/assessments/questionnaires/ cites ASQ-3 — they cite the CDC (52%),
// the WHO (17%), ASHA, the NHS and other professional-body milestone guidance. ASQ-3
// is a copyrighted, normed, licensed instrument; claiming kinship to it invited an IP
// and validity question the tool cannot answer, and bought nothing. Describe what this
// actually is, and say plainly what it is not.
const FRAMEWORK_PARAGRAPHS = [
  'Upllyft Developmental Screening is a multi-domain developmental screening and functional formulation tool. Its items are drawn from publicly available developmental milestone guidance — principally the CDC developmental milestones program, World Health Organization milestone guidance, ASHA speech-and-language milestones, and NHS developmental guidance. It organizes reported observations into recognized neurodevelopmental domains (including motor, language, cognition, social-emotional, adaptive functioning, sensory processing, and vision/hearing) and evaluates these against age-anchored developmental expectations.',
  'This is a screening checklist, not a standardized or normed instrument. It does not produce standardized scores and it has no published sensitivity or specificity. It is designed to surface areas that may be worth a conversation and, where appropriate, a referral — not to measure a child against a reference population.',
  'This screening tool is explicitly aligned with international diagnostic and functioning standards. Diagnostic classification remains the responsibility of qualified clinicians using established systems such as ICD-11 (WHO) and DSM-5-TR (APA). Functional interpretation within the framework is consistent with the ICF, emphasizing how observed patterns affect daily activities, participation, and contextual support needs.',
  'The screening integrates three complementary layers: (1) developmental milestone and skill mapping across domains; (2) synthesis of functional impact on everyday life, learning, and independence; and (3) non-diagnostic clinical hypothesis links that explain how observed patterns may relate to known neurodevelopmental mechanisms.',
  'All outputs are provided as clinical decision-support and require professional judgment. Results are expressed using screening-appropriate language and include confidence indicators to support responsible interpretation.',
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
    'Upllyft Developmental Screening',
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
  pdf.frameworkBox('About This Screening Tool', FRAMEWORK_PARAGRAPHS);

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
    'This report was generated using Upllyft Developmental Screening',
    'For questions or concerns, please consult with your healthcare provider or therapist.',
  ]);

  return pdf.toBuffer();
}
